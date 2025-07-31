document.addEventListener('DOMContentLoaded', function () {
    checkAuthenticationForDonation();
    loadDonationRequirements();

    const donateForm = document.getElementById('donate-form');
    if (donateForm) {
        donateForm.addEventListener('submit', handleDonorRegistration);
    }
});

function checkAuthenticationForDonation() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    const authMessage = document.getElementById('auth-message');
    const donateForm = document.getElementById('donate-form');

    if (token && user) {
        if (authMessage) authMessage.style.display = 'none';
        if (donateForm) donateForm.style.display = 'block';
    } else {
        if (authMessage) authMessage.style.display = 'block';
        if (donateForm) donateForm.style.display = 'none';
    }
}

async function loadDonationRequirements() {
    try {
        const response = await fetch('/api/donation-requirements');

        let data;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            const fallback = await response.text();
            console.warn('Non-JSON response:', fallback);
            showRequirementsError('Unexpected server response while loading requirements.');
            return;
        }

        if (response.ok) {
            displayRequirements(data);
        } else {
            showRequirementsError(data.error || 'Failed to load donation requirements');
        }
    } catch (error) {
        console.error('Error loading requirements:', error);
        showRequirementsError('Network error while loading requirements');
    }
}

function displayRequirements(requirements) {
    const requirementsContent = document.getElementById('requirements-content');
    if (!requirementsContent) return;

    requirementsContent.innerHTML = `
        <div class="requirement-item">
            <h4>Age Requirements</h4>
            <p>${requirements.age.description}</p>
        </div>
        <div class="requirement-item">
            <h4>Weight Requirements</h4>
            <p>${requirements.weight.description}</p>
        </div>
        <div class="requirement-item">
            <h4>Donation Frequency</h4>
            <p>${requirements.frequency.description}</p>
        </div>
        <div class="requirement-item">
            <h4>General Health Requirements</h4>
            <ul class="requirement-list">
                ${requirements.general.map(req => `<li>${req}</li>`).join('')}
            </ul>
        </div>
    `;
}

async function handleDonorRegistration(e) {
    e.preventDefault();

    const token = localStorage.getItem('token');
    if (!token) {
        showMessage('Please login to register as a donor', 'error');
        return;
    }

    const formData = new FormData(e.target);
    const donationData = {
        lastDonation: formData.get('lastDonation'),
        availableForEmergency: formData.has('availableForEmergency')
    };

    try {
        const response = await fetch('/api/donate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(donationData)
        });

        let result;
        const contentType = response.headers.get('content-type');

        if (contentType && contentType.includes('application/json')) {
            result = await response.json();
        } else {
            const fallback = await response.text();
            console.warn('Non-JSON response:', fallback);
            showMessage('Unexpected server error. Please try again later.', 'error');
            return;
        }

        if (response.ok) {
            showMessage('Successfully registered as a blood donor! Thank you for your willingness to save lives.', 'success');
            e.target.reset();
        } else {
            showMessage(result.error || 'Failed to register as donor', 'error');
        }
    } catch (error) {
        console.error('Donor registration error:', error);
        showMessage('Network error. Please try again.', 'error');
    }
}

function showRequirementsError(message) {
    const requirementsContent = document.getElementById('requirements-content');
    if (requirementsContent) {
        requirementsContent.innerHTML = `<div class="error">${message}</div>`;
    }
}

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
