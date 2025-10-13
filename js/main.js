document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("goToChart");
    if (btn) {
        btn.addEventListener("click", () => {
            window.location.href = "pages/chart.html";
        });
    }
});
