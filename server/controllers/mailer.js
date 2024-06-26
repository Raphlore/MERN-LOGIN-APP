import nodemailer from 'nodemailer';
import Mailgen from 'mailgen';
import ENV from '../config.js';

let nodeConfig = {
  host: 'smtp.ethereal.email',
  port: 587,
  secure: false,
  auth: {
    user: ENV.EMAIL,
    pass: ENV.PASSWORD,
  },
  logger: true,
  debug: true
};

let transporter = nodemailer.createTransport(nodeConfig);

let MailGenerator = new Mailgen({
  theme: 'default',
  product: {
    name: 'Mailgen',
    link: 'https://mailgen.js/'
  }
});

export const registerMail = async (req, res) => {
  const { username, userEmail, text, subject } = req.body;

  var email = {
    body: {
      name: username,
      intro: text || 'Welcome to our service! We are very excited to have you on board.',
      outro: 'Need help, or have questions? Just reply to this email, we\'d love to help.'
    }
  };

  var emailBody = MailGenerator.generate(email);

  let message = {
    from: ENV.EMAIL,
    to: userEmail,
    subject: subject || 'Signup Successfully',
    html: emailBody
  };

  transporter.sendMail(message)
    .then(() => {
      return res.status(200).send({ msg: 'You should receive an email from us' });
    })
    .catch(error => {
      console.error('Error sending email:', error); // Log detailed error information
      return res.status(500).send({ error: 'Failed to send email' });
    });
};
