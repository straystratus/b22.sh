window.food = {
  fav: `tea
rice
chicken`,
  dislike: `oysters
mushrooms`,
  breakfast: "Type 'breakfast' to view content."
};

// rendre visibles les fichiers dans le terminal
registerFile("aboutme/stratus/food/fav", "Text: food.fav");
registerFile("aboutme/stratus/food/dislike", "Text: food.dislike");
registerFile("aboutme/stratus/food/breakfast", "Text: food.breakfast");

// faire en sorte que la commande 'breakfast' marche aussi directement
registerCommand("breakfast", () => {
  return `
<strong>breakfast time!</strong>

here's what i eat in the morning (around 8am)

<a href="https://postimg.cc/xH8nXtQ8" target="_blank">photo 1</a>
<a href="https://postimg.cc/y3dSMxPt" target="_blank">photo 2</a>
`;
});
