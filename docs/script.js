// You can add any custom functionality here if required
console.log("Welcome to Aditya Chatterjee's Project Showcase!");

function toggleContent(id) {
    const content = document.getElementById(id);
    if (content.classList.contains("open")) {
        content.classList.remove("open");
    } else {
        content.classList.add("open");
    }
}