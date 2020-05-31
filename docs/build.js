const fs = require("fs-extra");
const md = require("markdown-it")();

const read = (file) => new Promise((resolve, reject) => {
    fs.readFile(`${__dirname}/src/${file}`, (err, data) => {
        if(err) {
            reject(err);
        }
        
        resolve(data.toString());
    });
});

const readChapters = new Promise((resolve, reject) => {
    fs.readdir(`${__dirname}/src/chapters`, (err, chapters) => {
        if(err) {
            reject();
        }

        resolve(chapters);
    });
});

// Everything inside title tag
const title = (html) => html.match(/\<title\>(.*?)\<\/title\>/)[1];

// Everything inside id tag
const id = (html) => html.match(/\<id\>(.*?)\<\/id\>/)[1];

// Everything after the id tag
const data = (html) => html.substr(html.indexOf("</id>") + 6);

(async () => {
    const chapters = await readChapters;
    const files = await Promise.all(chapters.map((file) => read(`chapters/${file}`)));
    
    let html = await read("index.html");

    let chaptersHtml = "";
    let navHtml = "";

    files.forEach((current) => {
        const content = data(current);
        const markdown = md.render(content);

        chaptersHtml +=  `
            <div id="${id(current)}" class="chapter">
                <a href="#${id(current)}" ><h1>${title(current)}</h1></a>
                ${markdown}
            </div>`;

        navHtml += `<a href="#${id(current)}">${title(current)}</a>`;
    });

    html = html.replace("{chapters}", chaptersHtml);
    html = html.replace("{nav}", navHtml);

    await fs.mkdirp(`${__dirname}/build`);

    fs.writeFile(`${__dirname}/build/index.html`, html, () => null);
    fs.copy(`${__dirname}/src/public`, `${__dirname}/build`);
})();
