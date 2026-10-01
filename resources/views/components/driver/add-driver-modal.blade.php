<div
  id="addDriverModal"
  class="modal-overlay"
  role="dialog"
  aria-modal="true"
  aria-labelledby="addDriverModalTitle"
  aria-describedby="addDriverModalDescription"
>
  <div class="custom-modal">
    <!-- Header -->
    <div class="modal-header">
      <div>
        <h2 id="addDriverModalTitle">Request New Driver</h2>

        <p id="addDriverModalDescription">
          Register a new hospital fleet driver.
        </p>
      </div>

      <button
        type="button"
        class="modal-close"
        id="closeAddDriverModal"
        aria-label="Close Add Driver modal"
      >
        <i class="ph ph-x"></i>
      </button>
    </div>

    <!-- Body -->
    <div class="modal-body">
      <form id="driverForm" class="driver-form vehicle-form">
        <!-- Driver Photo -->
        <div class="vehicle-image-section">
          <label class="vehicle-image-label" for="driverImage">
            Driver Photo
          </label>

          <div class="vehicle-image-upload">
            <img
              id="driverPreview"
              src="data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20viewBox%3D%270%200%20170%20170%27%3E%3Crect%20width%3D%27170%27%20height%3D%27170%27%20fill%3D%27%23f8fafc%27%2F%3E%3Ccircle%20cx%3D%2785%27%20cy%3D%2762%27%20r%3D%2730%27%20fill%3D%27%23cbd5e1%27%2F%3E%3Cpath%20d%3D%27M30%20155c10-35%2035-50%2055-50s45%2015%2055%2050%27%20fill%3D%27%23cbd5e1%27%2F%3E%3C%2Fsvg%3E"
              alt="Driver photo preview"
            />

            <input
                type="file"
                id="driverImage"
                name="photo"
                accept="image/*"
                hidden
            />

            <label for="driverImage" class="btn-outline upload-btn">
              <i class="ph ph-image"></i>
              Choose Photo
            </label>
          </div>
        </div>

          <div class="form-grid">
            <div class="form-group">
              <label for="driverFirstName">First Name *</label>
              <input
                  type="text"
                  id="driverFirstName"
                  name="first_name"
                  required
              >
          </div>

          <div class="form-group">
              <label for="driverLastName">Last Name *</label>
              <input
                  type="text"
                  id="driverLastName"
                  name="last_name"
                  required
              >
          </div>

          <div class="form-group">
            <label for="driverLicenseNumber">License Number *</label>
            <input
                type="text"
                id="driverLicenseNumber"
                name="license_number"
                required
            />
          </div>

          <div class="form-group">
            <label for="driverLicenseClass">License Class *</label>
            <select id="driverLicenseClass" name="license_class" required>
              <option value="">Select License Class</option>
              <option value="Professional">Professional</option>
              <option value="Non-Professional">Non-Professional</option>
            </select>
          </div>

          <div class="form-group">
            <label for="driverLicenseExpiry">
                License Expiry
                <span id="driverLicenseExpiryRequiredMark">*</span>
            </label>
            <input
                type="date"
                id="driverLicenseExpiry"
                name="license_expiry"
                required
            />
            <small
                class="form-hint"
                id="driverLicenseExpiryHint"
            >
                License expiry is required.
            </small>
          </div>

          <div class="form-group">
            <label for="driverPhone">Phone Number *</label>
            <input
                type="tel"
                id="driverPhone"
                name="contact_number"
                required
            />
          </div>

          <div class="form-group">
            <label for="driverEmail">Email *</label>
            <input
                type="email"
                id="driverEmail"
                name="email"
                required
            />
          </div>

          <div class="form-group">
            <label for="driverAssignedVehicle">Assigned Vehicle</label>
            <select id="driverAssignedVehicle" name="assigned_vehicle_id">
              <option value="">Select Assigned Vehicle</option>
              <option value="1">Ambulance 01</option>
              <option value="2">VAN 01</option>
              <option value="3">CAR 01</option>
            </select>
          </div>

          <div class="form-group">
            <label for="driverExperience">Experience (Years)</label>
            <input
                type="number"
                id="driverExperience"
                name="experience"
                min="0"
            />
          </div>

          <div class="form-group">
            <label for="driverStatus">Status *</label>
            <select id="driverStatus" name="status" required>
              <option value="">Select Status</option>
              <option value="Available">Available</option>
              <option value="On Leave">On Leave</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div class="form-group full-width">
            <label for="driverAddress">Address</label>
            <input
                type="text"
                id="driverAddress"
                name="address"
            />
          </div>

          <div class="form-group">
            <label for="driverEmergencyContact">Emergency Contact</label>
            <input
                type="tel"
                id="driverEmergencyContact"
                name="emergency_contact"
            />
          </div>

          <div class="form-group full-width">
            <label for="driverNotes">Notes</label>
            <textarea id="driverNotes" name="notes" rows="4"></textarea>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn-outline" id="cancelAddDriver">
            Cancel
          </button>

          <button type="submit" class="btn-primary" id="saveDriverBtn">
            <i class="ph ph-floppy-disk"></i>
            Save Driver
          </button>
        </div>
      </form>
    </div>
  </div>
</div>
