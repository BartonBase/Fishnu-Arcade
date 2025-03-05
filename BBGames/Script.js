// For future dynamic game loading
console.log("Welcome to Barton Base Games!");

// Example: Dynamically load games from a list (optional enhancement)
const games = [
    { title: "Broth Invaders", desc: "A thrilling space shooter with waves of invaders and epic power-ups.", url: "games/broth-invaders.html", thumb: "assets/broth-invaders-thumb.png" }
    // Add more games here in the future
];

// Uncomment to use dynamic loading:
// const gameList = document.getElementById("game-list");
// games.forEach(game => {
//     gameList.innerHTML += `
//         <div class="game-card">
//             <img src="${game.thumb}" alt="${game.title} Thumbnail" class="game-thumb">
//             <h2>${game.title}</h2>
//             <p>${game.desc}</p>
//             <a href="${game.url}" class="play-button">Play Now</a>
//         </div>
//     `;
// });