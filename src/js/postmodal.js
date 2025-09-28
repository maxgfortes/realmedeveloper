// Pega o modal post container
        const modal = document.getElementById('postmodal');
        
        // Pega todos os elementos com classe 'modalopen'
        const openButtons = document.querySelectorAll('.modalopen');
        
        // Pega os elementos de fechar
        const closeButton = document.querySelector('.close');
        const closeBtn = document.querySelector('.close-btn');

        // Função para abrir modal
        function openModal() {
            modal.style.display = 'flex';
            // Força o reflow para garantir que o display seja aplicado
            modal.offsetHeight;
            // Adiciona a classe show para iniciar as transições
            modal.classList.add('show');
            
            // Previne scroll da página
            document.body.style.overflow = 'hidden';
        }

        // Função para fechar modal
        function closeModal() {
            modal.classList.remove('show');
            
            // Aguarda a animação terminar antes de esconder
            setTimeout(() => {
                modal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }, 300);
        }

        // Adiciona evento de clique para todos os elementos com classe 'modalopen'
        openButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault(); // Previne comportamento padrão de links
                openModal();
            });
        });

        // Eventos para fechar modal
        closeButton.addEventListener('click', closeModal);
        closeBtn.addEventListener('click', closeModal);

        // Fechar modal clicando fora dele
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeModal();
            }
        });

        // Fechar modal com tecla ESC
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && modal.classList.contains('show')) {
                closeModal();
            }
        });

        // Exemplo de como usar o modal com dados dinâmicos
        document.querySelector('.btn-primary').addEventListener('click', function() {
            const textarea = document.querySelector('textarea');
            const fileInput = document.querySelector('input[type="file"]');
            
            if (textarea.value.trim() || fileInput.files.length > 0) {
                alert('Post criado com sucesso!');
                textarea.value = '';
                fileInput.value = '';
                closeModal();
            } else {
                alert('Escreva algo ou adicione uma mídia para publicar!');
            }
        });
