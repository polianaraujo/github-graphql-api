const url = "https://api.github.com/graphql";
const token = import.meta.env.VITE_GITHUB_ACCESS_TOKEN;
const queryGraphQL = `{
    viewer {
        login
        repositories(first: 10, orderBy: {field: UPDATED_AT, direction: DESC}) {
            nodes{
                name
                url
                description
            }
            totalCount
        }
    }
}`;

const fetchData = async () => {
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                query: queryGraphQL
            })
        });

        if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
        }

        const data = await response.json();

        if (data.data && data.data.viewer && data.data.viewer.repositories) {
            const repos = data.data.viewer.repositories.nodes;
            const login = data.data.viewer.login;
            let repoListHTML = '<h3>Repositórios de ${login}:</h3><ul>';
            if (repos.length > 0) {
                repos.forEach(repo => {
                    repoListHTML += `<li>
                    <strong><a rhef="{repo.url}" target="_blank">${repo.name}</a></strong>${repo.description ? `<p>${repo.description}</p>` : ''}
                    </li>`;
                });
            } else {
                repoListHTML += `<li>Nenhum repositório encontrado.</li>`;
            }
            repoListHTML += `</ul>`;
            document.querySelector('#feedback').innerHTML = repoListHTML;
            console.log('Dados dos repositórios:', data.data.viewer.repositories);
        } else {
            document.querySelector('#feedback').innerHTML = "Não foi possível buscar os repositórios, mas a conexão foi bem-sucedida."
            console.log('Reposta da API:', data);
        }
    } catch (e) {
        document.querySelector('#feedback').innerHTML = 'Erro ao conectar à API GraphQL do Github ou ao buscar repositórios.';
    }
}

// Fetch data from Github GraphQL API
fetchData();