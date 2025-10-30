const words = ["Full-stack Developer", "Cybersecurity Enthusiast"];
let i = 0; // word index
let j = 0; // letter index
let isDeleting = false;

function type() {
  const currentWord = words[i];
  const typingElement = document.getElementById("typing");

  typingElement.textContent = currentWord.substring(0, j);

  if (!isDeleting && j < currentWord.length) {
    j++;
    setTimeout(type, 100); // typing speed
  } else if (isDeleting && j > 0) {
    j--;
    setTimeout(type, 50); // deleting speed
  } else {
    if (!isDeleting) {
      setTimeout(() => {
        isDeleting = true;
        type();
      }, 1000); // pause before deleting
    } else {
      isDeleting = false;
      i = (i + 1) % words.length; // next word
      setTimeout(type, 500);
    }
  }
}

type();