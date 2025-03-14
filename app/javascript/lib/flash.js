document.addEventListener('turbo:load', function () {
  let alert = document.querySelector('.alert');

  if (alert) {
    setTimeout(() => {
      alert.classList.replace('opacity-100', 'opacity-0');

      alert.addEventListener('transitionend', () => {
        alert.style.display = 'none';
      }, { once: true });
      
    }, 5000);
  }
});
