require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const nodemailer = require('nodemailer')
const hbs = require('nodemailer-express-handlebars')
const { google } = require("googleapis");

const oAuth2Client = new google.auth.OAuth2(process.env.MAIL_CLIENT_ID, process.env.MAIL_CLIENT_SECRET, process.env.MAIL_REDIRECT_URI);
oAuth2Client.setCredentials({ refresh_token: process.env.MAIL_REFRESH_TOKEN });


// SERVER CONFIG _____________________________________________________

const app = express();

app.listen(process.env.PORT, () => {
  console.log(`Le serveur est lancé sur le port ${process.env.PORT}.`);
});

app.use(
  cors({
    origin: "*"
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// NODEMAILER _______________________________________________________

const sendEmailProducts = async (toEmail, cart) => {
  try {
    const accessToken = await oAuth2Client.getAccessToken();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: "andrea.naturopathie@gmail.com",
        clientId: process.env.MAIL_CLIENT_ID,
        clientSecret: process.env.MAIL_CLIENT_SECRET,
        refreshToken: process.env.MAIL_REFRESH_TOKEN,
        accessToken: accessToken
      },
      tls: {
        rejectUnauthorized: false
      }
    })

    const handlebarOptions = {
      viewEngine: {
        partialsDir: path.join(__dirname, '../storage/handlebars'),
        defaultLayout: false,
      },
      viewPath: path.join(__dirname, '../storage/handlebars'),
    };

    transporter.use('compile', hbs(handlebarOptions))

    let mailOptions = {
      from: "Andrea SOBRERO <andrea.naturopathie@gmail.com>",
      to: toEmail,
      subject: "Tes achats sur andrea-naturopathie.com",
      template: 'purchase',
      context: {
        date: new Date(Date.now()).toLocaleDateString("fr-FR"),
        cart: cart
      },
      attachments: []
    }

    Object.keys(cart.items).map(product => {
      mailOptions.attachments.push({
        filename: cart.items[product].name,
        path: path.join(__dirname, '../storage', cart.items[product].file),
        contentType: 'application/pdf'
      })
    })

    return transporter.sendMail(mailOptions)
  } catch (error) {
    console.log(error)
  }
}


// ROUTES ___________________________________________________________

app.post('/create-payment-intent', async (req, res) => {
  const { amount, currency, cardId } = req.body;

  try {
    if (amount < 100) throw new Error()

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: currency,
      payment_method_types: ['card'],
      payment_method: cardId
    })

    res.send({
      clientSecret: paymentIntent.client_secret
    })
  } catch {
    return null
  }
})

app.post('/send-products-by-email', async (req, res) => {
  const { email, cart } = req.body;

  try {
    await sendEmailProducts(email, cart)

    res.sendStatus(200)
  } catch (err) {
    console.log(err.message)
  }
})

app.get('/test', (req, res) => {
  res.send("Test ok !")
})