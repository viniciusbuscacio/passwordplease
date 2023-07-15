// this file is used by the page passwords.html

// if the user clicks on the Add Password button, send the event AddPassword to the main process
document.getElementById('addPassword').addEventListener('click', () => {
    ipcRenderer.send('addPassword');
});

// when the page is ready, send the event passwords-page-ready to the main process
window.addEventListener('DOMContentLoaded', (event) => {
    ipcRenderer.send('passwords-page-ready');
});


// Event listener for the password table
// will add events for edit, copy username, copy password and delete
document.querySelector('#passwordsTable').addEventListener('click', (event) => {
    let target = event.target;

    if (target.closest('.edit-button')) {
        target = target.closest('.edit-button');
        const id = target.getAttribute('data-id');

        ipcRenderer.send('edit-record', id);
    }

    if (target.closest('.copy-username-button')) {
        const usernameElement = target.closest('tr').querySelector('.username-column');
        const username = usernameElement.textContent.trim();
        window.focus(); // Make sure the window is focused
        copyToClipboard(username);

    }

    if (target.closest('.copy-password-button')) {
        const passwordElement = target.closest('tr').querySelector('.password-column');
        const password = passwordElement.textContent.trim();
        window.focus(); // Make sure the window is focused
        copyToClipboard(password);

    }

    if (target.closest('.delete-button')) {
        target = target.closest('.delete-button');
        const id = target.getAttribute('data-id');

        // Display the confirmation pop-up
        const confirmed = confirm('Are you sure you want to delete this record?');

        if (confirmed) {
            ipcRenderer.send('delete-record', id);
        } else {
            // User canceled the deletion, no action required
        }
    }

    // Handle row selection for left-click and right-click
    if (target.tagName === 'TD' || event.button === 2 ) {
        // Remove the 'selected' class from all table rows
        const tableRows = document.querySelectorAll('#passwordsTable tbody tr');
        tableRows.forEach((row) => {
            row.classList.remove('selected');
        });

        // Add the 'selected' class to the clicked row
        if (target.closest('tr')) {
            const row = target.closest('tr');
            row.classList.add('selected');
        }
    }

    // Event listener to display the context menu
    if (event.button === 2) {
        event.preventDefault(); // Prevent the default browser context menu

        const menu = document.querySelector('#tableContextMenu');
        menu.style.left = `${event.clientX}px`;
        menu.style.top = `${event.clientY}px`;
        menu.style.display = 'block';
    } else {
        // Hide the context menu when clicking anywhere outside it
        const menu = document.querySelector('#tableContextMenu');
        menu.style.display = 'none';
    }
});



// Manipulate the actions of the context menu
document.querySelector('#tableContextMenu').addEventListener('click', (event) => {
    const target = event.target;
    const selectedRow = document.querySelector('.selected');

    if (target.id === 'menuCopyUsername') {

        if (selectedRow) {
            const usernameElement = selectedRow.querySelector('.username-column');
            const username = usernameElement.textContent.trim();
            copyToClipboard(username);

            const menu = document.querySelector('#tableContextMenu');
            menu.style.display = 'none';
        }
    }

    if (target.id === 'menuCopyPassword') {

        if (selectedRow) {
            const passwordElement = selectedRow.querySelector('.password-column');
            const password = passwordElement.textContent.trim();
            copyToClipboard(password);

            const menu = document.querySelector('#tableContextMenu');
            menu.style.display = 'none';
        }
    }
});

// Copy the content to the clipboard
function copyToClipboard(text) {

    navigator.clipboard.writeText(text)
        .then(() => {

        })
        .catch((error) => {
            console.error('Error copying text to clipboard:', error);
        });
}

// Event listener for double click on table rows
document.querySelector('#passwordsTable').addEventListener('dblclick', (event) => {
    const target = event.target;

    if (target.tagName === 'TD') {
        const row = target.parentNode;
        const id = row.querySelector('.edit-button').getAttribute('data-id');

        ipcRenderer.send('edit-record', id);
    }
});


// search the information in the table and display the results
function performSearch() {
    const searchText = document.getElementById('searchInput').value.toLowerCase();
    const selectedCategory = document.getElementById('categoryFilter').value;
    const tableRows = document.querySelectorAll('#passwordsTable tbody tr');
    
    tableRows.forEach((row) => {
      let titleElement = row.querySelector('.title-column');
      let usernameElement = row.querySelector('.username-column');
      let title = titleElement ? titleElement.textContent.toLowerCase() : '';
      let username = usernameElement ? usernameElement.textContent.toLowerCase() : '';
  
      let rowCategoryElement = row.querySelector('.category-column');
      let rowCategory = rowCategoryElement ? rowCategoryElement.textContent : '';
  
      if ((title.includes(searchText) || username.includes(searchText)) && (selectedCategory === 'Select Category' || rowCategory === selectedCategory)) {
        row.style.display = '';
      } else {
        row.style.display = 'none';
      }
    });
}

// clear the search when the category changes
document.getElementById('categoryFilter').addEventListener('change', function() {
    document.getElementById('searchInput').value = '';
  });
  
  
// Declarar a variável 'categoryMapping' fora da função para torná-la global
let categoryMapping = {};

async function fillCategoryFilterDropdown() {
    const categoryFilterDropdown = document.getElementById('categoryFilter');
  
    // Limpar as opções existentes
    categoryFilterDropdown.innerHTML = '';
  
    // Adicionar a opção "Todas as Categorias"
    const allCategoriesOption = document.createElement('option');
    allCategoriesOption.value = '';
    allCategoriesOption.textContent = 'All Categories';
    categoryFilterDropdown.appendChild(allCategoriesOption);
  
    try {
      const categories = await ipcRenderer.invoke('getcategories');
      
      // Preencher 'categoryMapping' com os dados de 'categories'
      categories.forEach(category => {
        categoryMapping[category.categoryName] = category.categoryId;
      });

      categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.categoryName;
        option.textContent = category.categoryName;
        categoryFilterDropdown.appendChild(option);
      });
    } catch (error) {
      console.error('Error retrieving categories from the database:', error);
    }
}

// load the function to fill the dropdown menu when the page is loaded
document.addEventListener('DOMContentLoaded', fillCategoryFilterDropdown);

// filter the password table by category
function filterByCategory() {
    const selectedCategoryName = document.querySelector('#categoryFilter').value;
    const selectedCategoryId = categoryMapping[selectedCategoryName];
    const tableRows = document.querySelectorAll('#passwordsTable tbody tr');
  
    tableRows.forEach((row) => {
      const rowCategoryIdElement = row.querySelector('.categoryId-column');
      if (rowCategoryIdElement) {
        const rowCategoryId = rowCategoryIdElement.textContent;
        if (selectedCategoryName === '' || rowCategoryId === selectedCategoryId) {
          row.style.display = '';
        } else {
          row.style.display = 'none';
        }
      }
    });
  }

  // add event listener to dropdown
  document.querySelector('#categoryFilter').addEventListener('change', filterByCategory);
  


// Add event listener to filter when category changes
document.querySelector('#categoryFilter').addEventListener('change', filterByCategory);


// Event listener to display the context menu
document.addEventListener('contextmenu', (event) => {
    event.preventDefault(); // Prevent the default browser context menu
    const menu = document.querySelector('#tableContextMenu');
    menu.style.left = `${event.clientX}px`;
    menu.style.top = `${event.clientY}px`;
    menu.style.display = 'block';
});

// Listener event to perform search
document.getElementById('searchInput').addEventListener('input', performSearch);


// button to edit categories
document.getElementById('editCategories').addEventListener('click', () => {
    ipcRenderer.send('editCategories');
  }); 