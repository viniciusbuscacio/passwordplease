let categoriesEditions = {
  initialCategories: [], // filled initially with categories from database
  deletedCategories: [],
  createdCategories: [],
  editedCategories: []
};

// check if we are in the editCategories page
if (location.pathname.includes('editCategories.html')) {
  document.addEventListener('DOMContentLoaded', async () => {
    try {
      // get the current categories from the main process
      const rows = await ipcRenderer.invoke('getcategories');
      if (rows && rows.length > 0) {
        // Fill the initialCategories array
        categoriesEditions.initialCategories = rows.map(row => ({...row})); // Make a copy of each row object
        fillcategoriesTable(rows);
      } else {

      }
    } catch (error) {
      console.error(`Error loading categories page: ${error}`);
    }

    function fillcategoriesTable(categories) {
      const table = document.getElementById('categoriesTable').getElementsByTagName('tbody')[0];
      
      categories.forEach((category) => {
        const row = table.insertRow();
        const cellId = row.insertCell(0); // Hidden cell for categoryId
        const cellName = row.insertCell(1); // Cell for categoryName
        const cellAction = row.insertCell(2); // Cell for action buttons
    
        cellId.style.display = 'none'; // Hide the cell
        cellId.innerHTML = category.categoryId; // Set the categoryId as the cell content
        cellName.innerHTML = category.categoryName;
        cellName.setAttribute('data-category-id', category.categoryId); // Set the categoryId as a data attribute
    
        // Create the action buttons for the category
        const editButton = document.createElement('button');
        editButton.innerHTML = 'Edit';
        editButton.className = 'btn btn-outline-primary edit-category-button';
        editButton.style.marginRight = '5px'; // Adicione essa linha para definir a margem
        
        const deleteButton = document.createElement('button');
        deleteButton.innerHTML = 'Delete';
        deleteButton.className = 'btn btn-outline-danger';
        deleteButton.style.marginRight = '5px'; // Adicione essa linha para definir a margem
        
    
        const categoryCell = row.cells[1];
    
    
        // Add event listener to the edit button
        editButton.addEventListener('click', function (event) {
          event.stopPropagation(); // Prevent event from propagating
          event.preventDefault(); // Prevent any default behavior
    
          const currentCategoryName = categoryCell.innerHTML;
          const currentCategoryId = categoryCell.dataset.categoryId; // Get the categoryId using dataset
    
          const editInput = document.createElement('input');
          editInput.type = 'text';
          editInput.value = currentCategoryName;
    
          categoryCell.innerHTML = '';
          categoryCell.appendChild(editInput);
    
          editInput.focus();
    
          // Listen for the 'Enter' key being pressed
          editInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
              e.preventDefault();
              this.blur();
            }
          });
    
          editInput.addEventListener('blur', function (e) {

            // Check if the blur event was caused by clicking outside the input
            if (!editInput.contains(e.relatedTarget)) {

              const updatedCategoryName = editInput.value;
    
              // Remove the editInput from the cell
              this.remove();
    
              // Then update the cell content
              categoryCell.innerHTML = updatedCategoryName;
    
              // Update the category object with the updated name and id
              category.categoryName = updatedCategoryName;
              category.categoryId = currentCategoryId;
    
              // TODO: Update the category name in the database
              // You can use the category.categoryId and updatedCategoryName variables here
              categoriesEditions.editedCategories.push({ categoryId: currentCategoryId, categoryName: updatedCategoryName });
            }
          });
        });
    
        // Add event listener to the delete button
        deleteButton.addEventListener('click', function () {
          const deletedCategoryName = this.parentNode.parentNode.getElementsByTagName('td')[0].innerHTML;
   
          // Check if the deleted category was a newly created one
          const isCreatedCategory = categoriesEditions.createdCategories.includes(deletedCategoryName);
          if (isCreatedCategory) {
            // If it is a created category, remove it from createdCategories
            categoriesEditions.createdCategories = categoriesEditions.createdCategories.filter(category => category !== deletedCategoryName);
          } else {
            // If it is not a created category, add it to deletedCategories
            categoriesEditions.deletedCategories.push(deletedCategoryName);
          }
    
          this.parentNode.parentNode.remove();
        });
    
        cellAction.appendChild(editButton);
        cellAction.appendChild(deleteButton);
      });
    }
    
  
    // Adicionar manipulador de evento ao campo de texto de nova categoria
    const newCategoryNameInput = document.getElementById('newCategoryName');
    newCategoryNameInput.addEventListener('keydown', function(event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        addNewCategory();
      }
    });

    // Adicionar manipulador de evento ao botão "Add Category"
    document.getElementById('addCategoryButton').addEventListener('click', addNewCategory);

    // Função para adicionar uma nova categoria à tabela
    function addNewCategory() {
      const newCategoryNameInput = document.getElementById('newCategoryName');
      const newCategoryName = newCategoryNameInput.value.trim();

      // Verificar se o campo de nova categoria está preenchido
      if (newCategoryName !== '') {
        const table = document.getElementById('categoriesTable').getElementsByTagName('tbody')[0];
        const row = table.insertRow();
        const cell1 = row.insertCell(0); // Category name
        const cell2 = row.insertCell(1); // Action buttons

        cell1.innerHTML = newCategoryName;

        // Clear the input field
        newCategoryNameInput.value = '';

        // Create the action buttons for the new category
        const editButton = document.createElement('button');
        editButton.innerHTML = 'Edit';
        editButton.className = 'btn btn-outline-primary edit-category-button';

        const deleteButton = document.createElement('button');
        deleteButton.innerHTML = 'Delete';
        deleteButton.className = 'btn btn-outline-danger';

        // Add event listener to the delete button
        deleteButton.addEventListener('click', function () {
          const deletedCategoryName = this.parentNode.parentNode.getElementsByTagName('td')[0].innerHTML;

          // Check if the deleted category was a newly created one
          const isCreatedCategory = categoriesEditions.createdCategories.includes(deletedCategoryName);
          if (isCreatedCategory) {
            // If it is a created category, remove it from createdCategories
            categoriesEditions.createdCategories = categoriesEditions.createdCategories.filter(category => category !== deletedCategoryName);
          } else {
            // If it is not a created category, add it to deletedCategories
            categoriesEditions.deletedCategories.push(deletedCategoryName);
          }

          this.parentNode.parentNode.remove();
        });

        cell2.appendChild(editButton);
        cell2.appendChild(deleteButton);

        // Add the new category name to the createdCategories array
        categoriesEditions.createdCategories.push(newCategoryName);
      }
    }

    // New form submission event listener
    document.getElementById('categoryManagementForm').addEventListener('submit', (event) => {
      event.preventDefault();
    
      // Compare current categories with initial categories
      const currentCategories = Array.from(document.getElementById('categoriesTable').getElementsByTagName('tr')).map(row => ({
        categoryId: row.cells[0].innerHTML,
        categoryName: row.cells[1].textContent
      }));
    
      categoriesEditions.editedCategories = currentCategories.filter(current => {
        const initialCategory = categoriesEditions.initialCategories.find(initial => initial.categoryId === current.categoryId);
        return initialCategory && initialCategory.categoryName !== current.categoryName;
      });
    
      // Send the categoriesEditions object to the main process
      ipcRenderer.send('saveCategories', categoriesEditions);
    });
  });
}

// Add event listener to the back button
document.getElementById('cancelCategoriesButton').addEventListener('click', function () {
  ipcRenderer.send('goBack');
});



// Listen for the categoriesSaved event from the main process
ipcRenderer.on('categoriesSaved', (event, updatedCategories) => {
    const tableRows = document.getElementById('categoriesTable').getElementsByTagName('tr');
    for (let i = 0; i < updatedCategories.length; i++) {
      const rowCells = tableRows[i].getElementsByTagName('td');
      const category = updatedCategories[i];
      rowCells[0].setAttribute('data-category-id', category.categoryId); // Update the data attribute with the categoryId
    }
    ipcRenderer.send('update-passwords-page');

});


// Event listener for double click on table rows
document.querySelector('#categoriesTable').addEventListener('dblclick', (event) => {
  const target = event.target;
  if (target.tagName === 'TD') {
    const row = target.parentNode;
    const editButton = row.querySelector('.edit-category-button');
    if (editButton) {
      editButton.click(); // Dispara o evento de clique no botão "Edit"
    }
  }
});

