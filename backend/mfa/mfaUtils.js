const nodemailer = require("nodemailer");

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

let transporterPromise;

// Create transporter
const getTransporter = async () => {
  if (!transporterPromise) {
    transporterPromise = (async () => {
      const testAccount = await nodemailer.createTestAccount();

      const transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });

      console.log("Ethereal account ready");
      console.log("Ethereal user:", testAccount.user);

      return transporter;
    })();
  }

  return transporterPromise;
};

const sendOTPEmail = async (toEmail, otp) => {
  if (!toEmail) {
    throw new Error("Recipient email missing");
  }

  const transporter = await getTransporter();

  const info = await transporter.sendMail({
    from: '"MFA System" <no-reply@example.com>',
    to: toEmail,
    subject: "Your OTP Code",
    text: `Your OTP code is: ${otp}. It expires in 10 minutes.`,
    html: `
      <p>Your OTP code is: <b>${otp}</b></p>
      <p>This OTP will expire in 10 minutes.</p>
    `,
  });

  console.log("Preview URL:", nodemailer.getTestMessageUrl(info));
  return info;
};

module.exports = {
  generateOTP,
  sendOTPEmail,
};