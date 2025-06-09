// ----------------------------------------------------
// SEÇÃO 1: CONFIGURAÇÃO INICIAL E CONSTANTES GLOBAIS
// ----------------------------------------------------

const url = "https://api.github.com/graphql";
const token = import.meta.env.VITE_GITHUB_ACCESS_TOKEN;
// const queryGraphQL = `{
//     viewer {
//         login
//         repositories(first: 10, orderBy: {field: UPDATED_AT, direction: DESC}) {
//             nodes{
//                 name
//                 url
//                 description
//             }
//             totalCount
//         }
//     }
// }`;
const queryGraphQL = `
query GetRepositories($first: Int, $after: String, $last: Int, $before: String) {
    viewer {
        login
        repositories(
            first: $first,
            after: $after,
            last: $last,
            before: $before,
            orderBy: { field: UPDATED_AT, direction: DESC }
        ) {
            nodes {
                id # Precisamos do ID para o Star/Unstar no futuro
                name
                url
                description
            }
            pageInfo {
                endCursor
                hasNextPage
                hasPreviousPage
                startCursor
            }
            totalCount
        }
    }
}`;

// referências dos botões do HTML para que possamos manipulá-los no JavaScript.
const prevButton = document.querySelector('#prev-button');
const nextButton = document.querySelector('#next-button');


// -----------------------------------------------------------------
// SEÇÃO 2: A FUNÇÃO DE RENDERIZAÇÃO (O "PINTOR" DA PÁGINA)
// -----------------------------------------------------------------

// Esta função tem uma única responsabilidade: receber os dados da API e "pintar" o HTML na tela.
const renderRepos = (data) => {
    // Verificação de segurança para garantir que a resposta da API tem a estrutura que esperamos.
    if (data.data && data.data.viewer && data.data.viewer.repositories) {
        const repos = data.data.viewer.repositories.nodes;
        const login = data.data.viewer.login;
        const totalCount = data.data.viewer.repositories.totalCount;

        let repoListHTML = `<h3>Exibindo ${repos.length} de ${totalCount} repositórios de ${login}:</h3><ul>`;
        
        if (repos.length > 0) {
            // Itera sobre cada repositório na lista e cria um item de lista (<li>) para ele.
            repos.forEach(repo => {
                repoListHTML += `<li>
                    <strong><a href="${repo.url}" target="_blank">${repo.name}</a></strong>
                    ${repo.description ? `<p>${repo.description}</p>` : ''}
                </li>`;
            });
        } else {
            repoListHTML += `<li>Nenhum repositório encontrado.</li>`;
        }
        repoListHTML += `</ul>`;

        // Pega o elemento 'feedback' no HTML e substitui seu conteúdo pela nossa lista.
        document.querySelector('#feedback').innerHTML = repoListHTML;
    } else {
        document.querySelector('#feedback').innerHTML = "Não foi possível buscar os repositórios, mas a conexão foi bem-sucedida.";
        console.log('Resposta da API:', data);
    }
};


// ---------------------------------------------------------------------------
// SEÇÃO 3: A FUNÇÃO PRINCIPAL (O "CÉREBRO" DA APLICAÇÃO)
// ---------------------------------------------------------------------------

// fetchData se preocupa em buscar os dados, e a renderRepos se preocupa em exibir os dados.

// Esta é a função mais importante. Ela é assíncrona e lida com toda a lógica da API.
const fetchData = async ({ first = 10, after = null, last = null, before = null }) => {

    // 1. Fornece feedback visual imediato ao usuário.
    document.querySelector('#feedback').innerHTML = '<p>Carregando...</p>';
    prevButton.disabled = true;
    nextButton.disabled = true;

    // 2. O bloco try...catch lida com erros de rede ou falhas na requisição.
    try {
        // 3. A requisição fetch para a API.
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `bearer ${token}`,
                "Content-Type": "application/json"
            },
            // O corpo agora envia a query E as variáveis
            body: JSON.stringify({
                query: queryGraphQL,
                variables: { first, after, last, before } // Preenche os "espaços em branco" da query
            })
        });
        
        // 5. Tratamento de erros HTTP (ex: 404, 500)
        if (!response.ok) {
            const errorBody = await response.json();
            console.error("Erro da API:", errorBody); // Mostra o erro detalhado no console
            throw new Error(`Response status: ${response.status}`);
        }

        const data = await response.json();
        
        // 6. Tratamento de erros lógicos do GraphQL (a requisição foi OK, mas a query tinha um problema)
        if (data.errors) {
            console.error("Erros do GraphQL:", data.errors);
            throw new Error("A API GraphQL retornou erros.");
        }

        // 7. Se tudo deu certo, chama a função para renderizar os dados.
        renderRepos(data); // Usa a função de renderização

        // 8. Lógica de paginação pós-requisição.
        const pageInfo = data.data.viewer.repositories.pageInfo;
        nextButton.disabled = !pageInfo.hasNextPage;
        prevButton.disabled = !pageInfo.hasPreviousPage;

        // Guarda os cursores nos próprios botões usando 'dataset' para uso futuro.
        nextButton.dataset.cursor = pageInfo.endCursor;
        prevButton.dataset.cursor = pageInfo.startCursor;

    } catch (e) {
        // Se qualquer erro ocorrer no bloco 'try', ele é capturado aqui.
        document.querySelector('#feedback').innerHTML = 'Erro ao conectar à API GraphQL do Github ou ao buscar repositórios.';
        console.error(e);
    }
};


// -----------------------------------------------------------------
// SEÇÃO 4: "OUVINTES" DE EVENTOS (A "COLA" ENTRE O USUÁRIO E O CÓDIGO)
// -----------------------------------------------------------------

// Define o que acontece quando o botão "Próximo" é clicado.
nextButton.addEventListener('click', () => {
    // Chama a função fetchData com os argumentos para ir PARA FRENTE.
    fetchData({ first: 10, after: nextButton.dataset.cursor });
});

// Define o que acontece quando o botão "Anterior" é clicado.
prevButton.addEventListener('click', () => {
    // Chama a função fetchData com os argumentos para ir PARA TRÁS.
    // A chave aqui é `first: null` para evitar o conflito de `first` e `last` na mesma chamada.
    fetchData({ first: null, last: 10, before: prevButton.dataset.cursor });
});


// -----------------------------------------------------------------
// SEÇÃO 5: CHAMADA INICIAL (O "GATILHO" DA APLICAÇÃO)
// -----------------------------------------------------------------

// Quando o script carrega, esta é a primeira e única chamada direta à fetchData.
// Ela busca a primeira página de 10 repositórios e inicia todo o ciclo.
fetchData({ first: 10 });