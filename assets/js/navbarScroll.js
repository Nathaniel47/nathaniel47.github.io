document.addEventListener("DOMContentLoaded", function () {
  const navbar = document.getElementById("mainNavbar");
  let isScrolling;
  let isHovered = false; // Track hover state

  // Add smooth transition
  navbar.style.transition = "transform 0.5s ease-in-out";

  window.addEventListener("scroll", () => {
    // Always show when scrolling
    navbar.style.transform = "translateY(0)";

    // Clear previous timeout
    window.clearTimeout(isScrolling);

    // Hide navbar when scrolling stops (only if not at top and not hovered)
    isScrolling = setTimeout(() => {
      if (window.scrollY > 100 && !isHovered) {
        navbar.style.transform = "translateY(-110%)";
      }
    }, 1000);
  });

  // When mouse enters, mark hovered and show navbar
  navbar.addEventListener("mouseenter", () => {
    isHovered = true;
    navbar.style.transform = "translateY(0)";
    window.clearTimeout(isScrolling); // cancel any pending hide
  });

  // When mouse leaves, unmark hovered and hide if not at top
  navbar.addEventListener("mouseleave", () => {
    isHovered = false;
    if (window.scrollY > 100) {
      navbar.style.transform = "translateY(-110%)";
    }
  });
});
