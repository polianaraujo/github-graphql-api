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

// Função para renderizar a lista de repositórios (refatorada)
const renderRepos = (data) => {
    if (data.data && data.data.viewer && data.data.viewer.repositories) {
        const repos = data.data.viewer.repositories.nodes;
        const login = data.data.viewer.login;
        const totalCount = data.data.viewer.repositories.totalCount;
        let repoListHTML = `<h3>Exibindo ${repos.length} de ${totalCount} repositórios de ${login}:</h3><ul>`;
        if (repos.length > 0) {
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
        document.querySelector('#feedback').innerHTML = repoListHTML;
    } else {
        document.querySelector('#feedback').innerHTML = "Não foi possível buscar os repositórios, mas a conexão foi bem-sucedida.";
        console.log('Resposta da API:', data);
    }
};

// 4. Função fetchData agora aceita as variáveis de paginação
const fetchData = async ({ first = 10, after = null, last = null, before = null }) => {
    document.querySelector('#feedback').innerHTML = '<p>Carregando...</p>';
    prevButton.disabled = true;
    nextButton.disabled = true;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `bearer ${token}`,
                "Content-Type": "application/json"
            },
            // O corpo agora envia a query E as variáveis
            body: JSON.stringify({
                query: queryGraphQL,
                variables: { first, after, last, before }
            })
        });

        if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
        }

        const data = await response.json();
        renderRepos(data); // Usa a função de renderização

        // 5. Guarda o pageInfo e atualiza os botões
        const pageInfo = data.data.viewer.repositories.pageInfo;
        nextButton.disabled = !pageInfo.hasNextPage;
        prevButton.disabled = !pageInfo.hasPreviousPage;

        // Adiciona os cursores aos botões para uso futuro
        nextButton.dataset.cursor = pageInfo.endCursor;
        prevButton.dataset.cursor = pageInfo.startCursor;

    } catch (e) {
        document.querySelector('#feedback').innerHTML = 'Erro ao conectar à API GraphQL do Github ou ao buscar repositórios.';
        console.error(e);
    }
};

// 6. Adiciona os Event Listeners aos botões
nextButton.addEventListener('click', () => {
    fetchData({ first: 10, after: nextButton.dataset.cursor });
});

prevButton.addEventListener('click', () => {
    // Para voltar, usamos `last` e `before` E garantimos que `first` é nulo
    fetchData({ first: null, last: 10, before: prevButton.dataset.cursor });
});


// 7. Chamada inicial para carregar a primeira página
fetchData({ first: 10 });