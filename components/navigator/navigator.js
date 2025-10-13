class Navigator extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    async connectedCallback() {
        // Attributes
        const imgSrc = this.getAttribute("img-src") || "";
        const link = this.getAttribute("link") || "#";
        const title = this.getAttribute("title") || "";

        // Load HTML and CSS
        const html = await fetch("components/navigator/navigator.html").then(r => r.text());
        const css = await fetch("components/navigator/navigator.css").then(r => r.text());

        this.shadowRoot.innerHTML = `
            <style>${css}</style>
            ${html}
        `;

        const img = this.shadowRoot.querySelector(".nav-icon");
        const container = this.shadowRoot.querySelector(".navigator");
        const titleElem = this.shadowRoot.querySelector("#title");

        if (img) img.src = imgSrc;
        if (container) {
            container.addEventListener("click", () => {
                window.location.href = link;
            });
        }
        if (titleElem) titleElem.textContent = title;
    }
}

customElements.define("navigator-component", Navigator);
