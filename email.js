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
    userEmails = userEmails.filter(i => !!i && !i.includes('facebook.com'));
    if (userEmails.length) {
        emails[key] = Array.from(new Set(userEmails.map(e => e.toLowerCase().trim())));
    }
});
console.log(emails, Object.keys(emails).length);
