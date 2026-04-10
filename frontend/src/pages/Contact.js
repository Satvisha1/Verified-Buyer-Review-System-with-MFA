import "./Contact.css";

function Contact() {
  return (
    <div className="contact-container">
      <h1>Contact Us</h1>
      <p>We’d love to hear from you! Reach out with any questions.</p>
      
      <form className="contact-form">
        <label>Name</label>
        <input type="text" placeholder="Your Name" required />

        <label>Email</label>
        <input type="email" placeholder="Your Email" required />

        <label>Message</label>
        <textarea placeholder="Your Message" required></textarea>

        <button type="submit">Send Message</button>
      </form>

      <div className="contact-info">
        <p>Email: contact@sweetcrumbs.com</p>
        <p>Phone: +977 9810000000</p>
        <p>Address: Swoyambhu, Kathmandu</p>
      </div>
    </div>
  );
}

export default Contact;