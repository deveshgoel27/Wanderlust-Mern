// Example starter JavaScript for disabling form submissions if there are invalid fields
(() => {
    'use strict'
  
    // Fetch all the forms we want to apply custom Bootstrap validation styles to
    const forms = document.querySelectorAll('.needs-validation')
  
    // Loop over them and prevent submission
    Array.from(forms).forEach(form => {
      form.addEventListener('submit', event => {
        if (!form.checkValidity()) {
          event.preventDefault()
          event.stopPropagation()
        }
  
        form.classList.add('was-validated')
      }, false)
    })
  })()

  // Show server-rendered flash messages as auto-hiding Bootstrap toasts
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.toast').forEach((toastEl) => {
      new bootstrap.Toast(toastEl).show()
    })
  })
