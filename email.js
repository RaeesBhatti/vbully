const fs = require('fs');

const data = require('./data.json');

const emails = {};

Object.entries(data['info']).map(([key, obj]) => {
    let userEmails = [];
    if (obj.basicInfo) {
        userEmails = userEmails.concat(obj.basicInfo.match(/[\\t|\\n| ]?([a-zA-Z0-9\._-]+\@[a-zA-Z]+\.(com|net))/g));
    }
    if (obj.contact) {
        userEmails = userEmails.concat(obj.contact.match(/[\\t|\\n| ]?([a-zA-Z0-9\._-]+\@[a-zA-Z]+\.(com|net))/g));
    }
    userEmails = userEmails.filter(i => !!i && !i.endsWith('facebook.com')).map(e => e.toLowerCase().trim());
    if (userEmails.length) {
        emails[key] = Array.from(new Set(userEmails));
    }
});

fs.writeFileSync('./emails.json', JSON.stringify(emails));
fs.writeFileSync('./emails.csv', Object.values(emails).map(es => es.sort(emailSort)[0]).join('\n'));
console.log(emails, Object.keys(emails).length);

function emailSort(a, b) {
    const importance = {"gmail.com": 1, "yahoo.com": 2, "rocketmail.com": 3, "ymail.com": 4};

    const importanceOfA = importance[a.split('@')[1]];
    const importanceOfB = importance[b.split('@')[1]];

    if (importanceOfA && !importanceOfB) return -1;
    if (importanceOfB && !importanceOfA) return 1;
    if (importanceOfA && importanceOfB) return importanceOfA - importanceOfB;

    return 0;
}
