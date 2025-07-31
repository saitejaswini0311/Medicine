// Donors page functionality
let allDonors = [];

document.addEventListener('DOMContentLoaded', function() {
    loadDonors();
});

// Load all donors
async function loadDonors() {
    try {
        const response = await fetch('/api/donors');
        
        const contentType = response.headers.get('content-type');

        if (response.ok && contentType && contentType.includes('application/json')) {
            allDonors = await response.json();
            displayDonors(allDonors);
            updateDonorCount(allDonors.length);
        } else {
            const text = await response.text(); // Read text for error debugging
            console.error('Unexpected response:', text);
            showError('Server returned an invalid response.');
        }
    } catch (error) {
        console.error('Error loading donors:', error);
        showError('Network error while loading donors');
    }
}

// Search donors based on filters
async function searchDonors() {
    const bloodGroupFilter = document.getElementById('blood-group-filter').value;
    const emergencyOnly = document.getElementById('emergency-only').checked;
    
    let filteredDonors = allDonors;
    
    if (bloodGroupFilter) {
        filteredDonors = filteredDonors.filter(donor => donor.bloodGroup === bloodGroupFilter);
    }
    
    if (emergencyOnly) {
        filteredDonors = filteredDonors.filter(donor => donor.availableForEmergency);
    }
    
    displayDonors(filteredDonors);
    updateDonorCount(filteredDonors.length);
}

// Display donors in the grid
function displayDonors(donors) {
    const donorsList = document.getElementById('donors-list');
    
    if (donors.length === 0) {
        donorsList.innerHTML = '<div class="loading">No donors found matching your criteria.</div>';
        return;
    }
    
    donorsList.innerHTML = donors.map(donor => `
        <div class="donor-card">
            <div class="donor-header">
                <div class="donor-name">${donor.name}</div>
                <div class="blood-group-badge">${donor.bloodGroup}</div>
            </div>
            <div class="donor-info">
                <p>📍 ${donor.location}</p>
                <p>👤 Age: ${donor.age}</p>
                <p>📅 Last donation: ${formatDate(donor.lastDonation)}</p>
                ${donor.availableForEmergency ? '<span class="emergency-badge">Emergency Available</span>' : ''}
            </div>
            <div class="donor-actions">
                <a href="tel:${donor.phone}" class="btn-call">
                    📞 Call ${donor.phone}
                </a>
            </div>
        </div>
    `).join('');
}

// Update donor count display
function updateDonorCount(count) {
    const totalDonors = document.getElementById('total-donors');
    if (totalDonors) {
        totalDonors.textContent = count;
    }
}

// Show error message
function showError(message) {
    const donorsList = document.getElementById('donors-list');
    donorsList.innerHTML = `<div class="error">${message}</div>`;
}

// Utility function to format date
function formatDate(dateString) {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString();
}
