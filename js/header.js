console.log("HEADER JS LOADED");

window.onload = function () {
    const text = document.getElementById("movingText");
    const container = document.querySelector(".moveText");

    let x = container.offsetWidth;
    const speed = 1;

    function animate() {
        x -= speed;
        text.style.left = x + "px";

        if (x < -text.offsetWidth) {
            x = container.offsetWidth;
        }
        console.log('Dinh An Dep Trai');

        requestAnimationFrame(animate);
    }

    animate();
};
