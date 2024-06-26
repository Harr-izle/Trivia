document.addEventListener('DOMContentLoaded', (event) => {
    // Get the modal
    const modal = document.getElementById("myModal");

    // Get the <span> element that closes the modal
    const span = document.getElementsByClassName("close")[0];

    // Get all the category cards
    const cards = document.getElementsByClassName("card");

    // When a card is clicked, open the modal
    for (let i = 0; i < cards.length; i++) {
        cards[i].onclick = function() {
            modal.style.display = "block";
        }
    }

    // When the user clicks on <span> (x), close the modal
    span.onclick = function() {
        modal.style.display = "none";
    }
});
