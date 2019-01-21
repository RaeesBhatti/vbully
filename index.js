const puppeteer = require('puppeteer');
const fs = require('fs');

const data = require('./data.json');

const info = data['info'] || {};
const users = new Set(data['users'] || []);
const usersVisited = new Set(data['usersVisited'] || []);

const groups = new Set(data['groups'] || ['35']);
const groupsVisited = new Set(data['groupsVisited'] || []);

const SITE_URL = process.env.SITE_URL;
const SITE_USERNAME = process.env.SITE_USERNAME;
const SITE_PASSWORD = process.env.SITE_PASSWORD;

(async () => {
    const browser = await puppeteer.launch({headless: false});
    const page = await browser.newPage();
    page.setViewport({width: 1366, height: 768});
    const groupId = pullFromSet('group')
    if (groupId) {
        await findNewLinks(page, groupId,'group',true);
    } else {
        await findNewLinks(page, pullFromSet('user'), 'user', true)
    }

    await browser.close();
})();

const findNewLinks = async (page, id, pageKind = 'user', first = false) => {
    const link = `${SITE_URL}${pageKind === 'user' ? 'member.php?u=' + id : `group.php?groupid=${id}&do=viewmembers`}`
    await page.goto(link, {timeout: 120000});

    if (first) {
        const userNameEl = await page.$('#vb_login_username');
        await userNameEl.click({delay: 100});
        await userNameEl.type(SITE_USERNAME, {delay: 90});
        const passwordEl = await page.$('#vb_login_password');
        await passwordEl.click({delay: 120});
        await passwordEl.type(SITE_PASSWORD, {delay: 110});
        const loginBtn = await page.$('.actionbuttons input[type=submit]')
        await loginBtn.click({delay: 160})
    }

    await page.waitFor(() => !!document.getElementById('socialgroup_members') || !!document.getElementById('userinfo'), {timeout: 120000});

    if (pageKind === 'user') {
        usersVisited.add(id)
    } else {
        groupsVisited.add(id)
    }

    const userIds = await page.$$eval('a[href^="member.php"]', ls => ls.map(a => new URL(a).searchParams.get('u')))
    userIds
        .filter(id => !!id && id.length)
        .filter(id => !usersVisited.has(id) && !users.has(id))
        .forEach(id => users.add(id))

    const groupIds = await page.$$eval('a[href^="group.php"]', ls => ls.map(a => new URL(a).searchParams.get('groupid')))
    groupIds
        .filter(id => !!id && id.length)
        .filter(id => !groupsVisited.has(id) && !groups.has(id))
        .forEach(id => groups.add(id))


    if (pageKind === 'user' && !info.hasOwnProperty(id)) {
        const userData = {basicInfo: null, contact: null, stats: null}
        const basicInfo = await page.$('#view-aboutme > .subsection')
        if (basicInfo) {
            const text = await (await basicInfo.getProperty('textContent')).jsonValue();
            userData.basicInfo = text.trim()
        }
        const contact = await page.$('#view-contactinfo')
        if (contact) {
            const text = await (await contact.getProperty('textContent')).jsonValue();
            userData.contact = text.trim()
        }
        const stats = await page.$('#view-stats')
        if (stats) {
            const text = await (await stats.getProperty('textContent')).jsonValue();
            userData.stats = text.trim()
        }
        info[id] = userData
    }

    saveData();

    if (users.size) {
        const userId = pullFromSet('user')
        return findNewLinks(page, userId, 'user')
    }
    if (groups.size) {
        const groupId = pullFromSet('group')
        return findNewLinks(page, groupId, 'group')
    }

    return true
}

const saveData = () => {
    return fs.writeFileSync('./data.json', JSON.stringify({
        users: Array.from(users),
        usersVisited: Array.from(usersVisited),
        groups: Array.from(groups),
        groupsVisited: Array.from(groupsVisited),
        info,
    }))
}

const pullFromSet = (kind = 'user') => {
    const it = (kind === 'user' ? users : groups).values();
    const {value, done} = it.next();
    if (done) {
        return;
    }
    (kind === 'user' ? users : groups).delete(value);
    return value;
}
