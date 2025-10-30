/* contact.js — attach to your page in Bootstrap Studio via the Design > JS panel */
document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("contactForm");
  const status = document.getElementById("formStatus");

  // Replace this with your Formspree endpoint:
  const FORMSPREE_ENDPOINT = "https://formspree.io/f/xgvpznzq";

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    // Basic client-side validity check (HTML5 will also run)
    if (!form.checkValidity()) {
      form.classList.add("was-validated");
      return;
    }

    // gather form data
    const data = {
      name: form.querySelector("[name='name']").value,
      email: form.querySelector("[name='email']").value,
      message: form.querySelector("[name='message']").value
    };

    // show loading state
    status.innerHTML = "<div class='alert alert-info'>Sending...</div>";
    const submitBtn = form.querySelector("[type='submit']");
    submitBtn.disabled = true;

    try {
      const response = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        status.innerHTML = "<div class='alert alert-success'>Your message is in my mail now, thank your for reaching out 🙂. I will reply shortly.</div>";
        form.reset();
        form.classList.remove("was-validated");
      } else {
        // Formspree often returns JSON with errors
        const result = await response.json().catch(() => ({}));
        const errorMsg = result.error || "There was a problem sending your message.";
        status.innerHTML = `<div class='alert alert-danger'>${errorMsg}</div>`;
      }
    } catch (err) {
      status.innerHTML = "<div class='alert alert-danger'>Network error. Please try again later.</div>";
    } finally {
      submitBtn.disabled = false;
    }
  });
});
