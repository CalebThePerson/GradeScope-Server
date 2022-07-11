const express = require('express')
const fs = require('fs').promises
const path = require("path");
const puppeteer = require('puppeteer')
const cheerio = require('cheerio')
const cors = require('cors')
const app = express()
const port = process.env.PORT || 3001


app.use(
    cors({
    origin: '*'
}));


//Server Endpoints
app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
  })

app.get('/login', async (req, res) => {
    console.log('Starting to Login')
    const email = req.query.email
    const password = req.query.pass

    const response = await altLogin(email, password, "Harvey Mudd College")

    if (response[0] == true) {
        res.send('Successfully logged in')
    }
    else {
        res.statusCode = 201
        res.send(response[1])
    }
})

/*app.get('/school_login', async (req, res) => {
    //This is the endpoint for the hopefully school-credential login
})*/

app.get('/get_classes', async(req,res) => {
    console.log('Scrapping the Classees')
    const data = await get_classes()
    if (data==false){
        res.statusCode = 201
        res.send('There was an error scrapping Classes')
    }
    // classes = await parseClasses(data['data'])
    res.send(data)
    
})

app.get('/get_assignments', async(req, res) => {
    console.log('Getting assignments')
    const course_id = req.query.id
    console.log('Course id is ' + course_id)
    const data = await get_assignments(course_id)
    if (data==false) {
        res.statusCode = 201
        res.send('There was an error getting the assignments')
    }
    res.send(data)
})


//Scrapping Functions 
async function login(email, password) {
    //First we create a new browser and page instance
    const browser = await puppeteer.launch()
    const page = await browser.newPage()
    await page.goto('https://www.gradescope.com/login')
    await page.waitForSelector('input[name=commit]')

    await page.type('#session_email', email)
    await page.type('#session_password', password)
    await page.click('input[name=commit]')
    await page.waitForNavigation()

    let response = await page.goto('https://www.gradescope.com/account')
    const url = await page.url()

    //This checks if the url is the account url becuase if so that means that
    //users have sucessfully logged in 
    if (url!= 'https://www.gradescope.com/account') {
        console.log('There was an error corresponding to login information')
        browser.close()
        return false
    }

    //Then we save the cookies so we can load it in other functions rather than constnatly needing to login
    const cookies = await page.cookies()
    await fs.writeFile('./cookies.json', JSON.stringify(cookies, null, 2))
    browser.close()
    return true
}

//login to Mudd account
async function altLogin(user, password, schoolName){
    //First we create a new browser and page instance
    const browser = await puppeteer.launch()
    const page = await browser.newPage()
    //Go to the Gradescope school-credential login school selection page
    await page.goto('https://www.gradescope.com/saml')
    await page.waitForSelector('.samlSearch')
    await page.type('.samlSearch', "Harvey Mudd College")
    await page.waitForSelector('.samlProvider--name')

    //Click on the Harvey Mudd Login button to go to RapidIdentity
    await page.click('.samlProvider--name')
    await page.waitForSelector('#authn-go-button')

    //Input RapidIdentity login info, then press "Go"
    await page.type('#identification', user)
    await page.type('#ember533', password)
    await page.click('#authn-go-button')
    //Wait for Duo auth stuff to load
    await page.waitForTimeout(3000)
    //Click the "send me a push option"
    if (await page.$('.positive') == null){
        browser.close()
        return [false, "Incorrect login info"]
    }

    await page.click('.positive')
    //You have 90 seconds to tap and approve request on duo phone app
    await page.waitForTimeout(10000)

    //Alt login w/ Duo passcode
    // (Note: you will need to get working passcode before every run of this function, this is meant for those
    // who don't have Duo mobile app)
    /*await page.click('#passcode')
    await page.type('input[name=factor]', "PASSCODE_HERE")
    await page.keyboard.press('Enter');
    await page.waitForTimeout(9000)*/

    /* Additional debug methods
    Screenshot (page provides a screenshot of current display)
    await page.screenshot({path: "screenshot.png", fullPage: true});

    HTML print (console.log HTML layout info (like w/ inspect elements) to terminal)
    const data = await page.evaluate(() => document.querySelector('*').outerHTML);
    console.log(data);
    */

    //Get and print url after 90 sec. If login is successful, you should be in Gradescope;
    // If not, you'll probably still be on the Duo auth page.
    let url = page.url()
    console.log(url)

    await page.goto('https://www.gradescope.com/account')
    url = page.url()

    //This checks if the url is the account url becuase if so that means that
    //users have sucessfully logged in
    if (url!= 'https://www.gradescope.com/account') {
        console.log('There was an error corresponding to login information')
        browser.close()
        return [false, "Duo auth failed"]
    }
    //Then we save the cookies so we can load it in other functions rather than constnatly needing to login
    const cookies = await page.cookies()
    await fs.writeFile('./cookies.json', JSON.stringify(cookies, null, 2))
    await page.screenshot({path: "screenshot.png", fullPage: true});
    browser.close()
    return [true, "Login success!"]
}


async function get_classes() {
    try {
        const cookiesString = await fs.readFile('./cookies.json')
        const cookies = JSON.parse(cookiesString)
    
        const browser = await puppeteer.launch()
        const page = await browser.newPage()
        await page.setCookie(...cookies)
        await page.goto('https://www.gradescope.com/account')
    
        const data = await page.evaluate(() => document.documentElement.outerHTML)
        browser.close()
        // console.log(data)
        return data
    } catch(e) {
        console.log(e)
        return false
    }

}

async function get_assignments(id) {
    try {
        const cookiesString = await fs.readFile('./cookies.json')
        const cookies = JSON.parse(cookiesString)
        const browser = await puppeteer.launch()
        const page = await browser.newPage()
        await page.setCookie(...cookies)
        await page.goto('https://www.gradescope.com'+id)
        
        const data = await page.evaluate(() => document.documentElement.outerHTML)
        browser.close()
        return data
    } catch (e){
        console.log(e)
        return false
    }
}

//Parsing Functions 


//This function may be re-worked depending on how we want to get data and how this wants to be used


