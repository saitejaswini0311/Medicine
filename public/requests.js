// Requests page functionality
document.addEventListener('DOMContentLoaded', function () {
    const requestForm = document.getElementById('request-form');
    if (requestForm) {
        requestForm.addEventListener('submit', handleRequestSubmission);
    }

    loadRecentRequests();
});

// Toggle item-specific fields
function toggleItemFields() {
    const requiredItem = document.getElementById('required-item').value;
    const bloodFields = document.getElementById('blood-fields');
    const medicineFields = document.getElementById('medicine-fields');
    const bloodGroup = document.getElementById('blood-group');
    const medicineDetails = document.getElementById('medicine-details');

    if (requiredItem === 'blood') {
        bloodFields.style.display = 'block';
        medicineFields.style.display = 'none';
        bloodGroup.required = true;
        medicineDetails.required = false;
    } else if (requiredItem === 'medicine') {
        bloodFields.style.display = 'none';
        medicineFields.style.display = 'block';
        bloodGroup.required = false;
        medicineDetails.required = true;
    } else {
        bloodFields.style.display = 'none';
        medicineFields.style.display = 'none';
        bloodGroup.required = false;
        medicineDetails.required = false;
    }
}

// Handle request form submission
async function handleRequestSubmission(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const requestData = {
        requesterName: formData.get('requesterName'),
        contactInfo: formData.get('contactInfo'),
        requiredItem: formData.get('requiredItem'),
        bloodGroup: formData.get('bloodGroup'),
        medicineDetails: formData.get('medicineDetails'),
        urgencyLevel: formData.get('urgencyLevel'),
        location: formData.get('location'),
        additionalDetails: formData.get('additionalDetails')
    };

    try {
        const response = await fetch('/api/requests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });

        const contentType = response.headers.get('content-type');

        if (response.ok && contentType && contentType.includes('application/json')) {
            const result = await response.json();
            showMessage('Request submitted successfully! Our community will be notified.', 'success');
            e.target.reset();
            toggleItemFields();
            loadRecentRequests();
        } else {
            const text = await response.text();
            console.error('Unexpected server response:', text);
            showMessage('Server returned invalid response.', 'error');
        }
    } catch (error) {
        console.error('Request submission error:', error);
        showMessage('Network error. Please try again.', 'error');
    }
}

// Load recent requests
async function loadRecentRequests() {
    try {
        const response = await fetch('/api/requests');
        const contentType = response.headers.get('content-type');

        if (response.ok && contentType && contentType.includes('application/json')) {
            const requests = await response.json();
            displayRecentRequests(requests.slice(0, 6));
        } else {
            const text = await response.text();
            console.error('Invalid recent requests response:', text);
            showRequestsError('Invalid data returned from server.');
        }
    } catch (error) {
        console.error('Error loading requests:', error);
        showRequestsError('Network error while loading requests');
    }
}

// Display recent requests
function displayRecentRequests(requests) {
    const requestsList = document.getElementById('recent-requests-list');

    if (!requestsList) return;

    if (requests.length === 0) {
        requestsList.innerHTML = '<div class="loading">No recent requests found.</div>';
        return;
    }

    requestsList.innerHTML = requests.map(request => `
        <div class="request-card-item">
            <div class="request-header">
                <div class="request-type">
                    ${request.requiredItem === 'blood' ? '🩸' : '💊'}
                    ${request.requiredItem.charAt(0).toUpperCase() + request.requiredItem.slice(1)} Request
                </div>
                <span class="urgency-badge urgency-${request.urgencyLevel}">
                    ${request.urgencyLevel.toUpperCase()}
                </span>
            </div>
            <div class="request-details">
                <p><strong>Requester:</strong> ${request.requesterName}</p>
                <p><strong>Contact:</strong> ${request.contactInfo}</p>
                ${request.bloodGroup ? `<p><strong>Blood Group:</strong> ${request.bloodGroup}</p>` : ''}
                ${request.medicineDetails ? `<p><strong>Medicine:</strong> ${request.medicineDetails}</p>` : ''}
                <p><strong>Location:</strong> ${request.location}</p>
                ${request.additionalDetails ? `<p><strong>Details:</strong> ${request.additionalDetails}</p>` : ''}
                <p><strong>Posted:</strong> ${timeAgo(request.createdAt)}</p>
            </div>
        </div>
    `).join('');
}

// Show requests error
function showRequestsError(message) {
    const requestsList = document.getElementById('recent-requests-list');
    if (requestsList) {
        requestsList.innerHTML = `<div class="error">${message}</div>`;
    }
}

// Show message
function showMessage(message, type = 'info') {
    const existingMessages = document.querySelectorAll('.error, .success');
    existingMessages.forEach(msg => msg.remove());

    const messageDiv = document.createElement('div');
    messageDiv.className = type === 'error' ? 'error' : 'success';
    messageDiv.textContent = message;

    const main = document.querySelector('.page-main .container');
    if (main) {
        main.insertBefore(messageDiv, main.firstChild);

        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
    }
}

// Utility function to format time ago
function timeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.ceil(diffDays / 30)} months ago`;
    return `${Math.ceil(diffDays / 365)} years ago`;
}
