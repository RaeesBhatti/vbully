const puppeteer = require('puppeteer');
const fs = require('fs');

const data = require('./data.json');

const info = data['info'] || {};
const users = data['users'] || [];
const usersVisited = data['usersVisited'] || [];

const groups = data['groups'] || ['35'];
const groupsVisited = data['groupsVisited'] || [];

const SITE_URL = process.env.SITE_URL;
const SITE_USERNAME = process.env.SITE_USERNAME;
const SITE_PASSWORD = process.env.SITE_PASSWORD;

(async () => {
    const browser = await puppeteer.launch({headless: false});
    const page = await browser.newPage();
    page.setViewport({width: 1366, height: 768});
    const interval = setInterval(saveData, 100000);
    await findNewLinks(page, groups.pop(),'group',true);
    clearInterval(interval);
    saveData()

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
        usersVisited.push(id)
    } else {
        groupsVisited.push(id)
    }

    const userIds = await page.$$eval('a[href^="member.php"]', ls => ls.map(a => new URL(a).searchParams.get('u')))
    userIds
        .filter(id => !!id && id.length)
        .filter(id => !usersVisited.includes(id) && !users.includes(id))
        .forEach(id => users.push(id))

    const groupIds = await page.$$eval('a[href^="group.php"]', ls => ls.map(a => new URL(a).searchParams.get('groupid')))
    groupIds
        .filter(id => !!id && id.length)
        .filter(id => !groupsVisited.includes(id) && !groups.includes(id))
        .forEach(id => groups.push(id))


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

    if (users.length) {
        const userId = users.shift()
        return findNewLinks(page, userId, 'user')
    }
    if (groups.length) {
        const groupId = groups.shift()
        return findNewLinks(page, groupId, 'group')
    }

    return true
}

const saveData = () => {
    return fs.writeFileSync('./data.json', JSON.stringify({users, usersVisited, groups, groupsVisited, info}))
}
