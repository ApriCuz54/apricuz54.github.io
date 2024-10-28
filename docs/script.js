// You can add any custom functionality here if required
console.log("Welcome to Aditya Chatterjee's Project Showcase!");

function toggleContent(id) {
    const content = document.getElementById(id);
    content.style.display = content.style.display === "none" || content.style.display === "" ? "block" : "none";
}