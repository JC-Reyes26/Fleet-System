<div
  class="modal-overlay"
  id="vehicleModal"
  role="dialog"
  aria-modal="true"
  aria-labelledby="vehicleModalTitle"
>
  <div class="custom-modal">
    <!-- Header -->
    <div class="modal-header">
      <div>
        <h2 id="vehicleModalTitle">Request New Vehicle</h2>
        <p>Register a new hospital fleet vehicle.</p>
      </div>

      <button
        type="button"
        class="modal-close"
        id="closeVehicleModal"
        aria-label="Close add vehicle dialog"
      >
        <i class="ph ph-x"></i>
      </button>
    </div>

    <!-- Body -->
    <div class="modal-body">
      <form
          class="vehicle-form"
          id="vehicleForm"
          action="{{ route('vehicles.store') }}"
          method="POST"
      >
          @csrf
        <!-- Vehicle Image -->
        <div class="vehicle-image-section">
          <label class="vehicle-image-label"> Vehicle Image </label>

          <div class="vehicle-image-upload">
            <img
              id="vehiclePreview"
              src="../assets/images/vehicle-placeholder.svg"
              alt="Vehicle Preview"
            />

            <input type="file" id="vehicleImage" accept="image/*" hidden />

            <label for="vehicleImage" class="btn-outline upload-btn">
              <i class="ph ph-image"></i>
              Choose Image
            </label>
          </div>
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label for="vehiclePlate">
                Plate Number
                <span id="vehiclePlateRequiredMark">*</span>
            </label>
            <input
                type="text"
                id="vehiclePlate"
                name="plate_number"
                placeholder="ABC-1234"
  
            />
          </div>

          <div class="form-group">
            <label for="vehicleType">Vehicle Type *</label>
            <select
                id="vehicleType"
                name="vehicle_type"
                required
            >
                <option value="">Select Vechicle Type</option>
                <option value="Ambulance">Ambulance</option>
                <option value="Patient Van">Patient Van</option>
                <option value="Service Vehicle">Service Vehicle</option>
                <option value="SUV">SUV</option>
                <option value="Motorcycle">Motorcycle</option>
            </select>
          </div>

          <div class="form-group">
            <label for="vehicleBrand">Brand *</label>

            <input
                type="text"
                id="vehicleBrand"
                name="brand"
                placeholder="Toyota"
                required
            >
        </div>

        <div class="form-group">
            <label for="vehicleModel">Model *</label>

            <input
                type="text"
                id="vehicleModel"
                name="model"
                placeholder="Hiace"
                required
            >
        </div>

        <div class="form-group">
          <label for="vehicleDepartment">
              Department
              <span
                  id="vehicleDepartmentRequiredMark"
                  hidden
              >*</span>
          </label>

          <select
              id="vehicleDepartment"
              name="department"
          >
              <option value="">Select Department</option>
              <option value="Emergency">Emergency</option>
              <option value="Outpatient">Outpatient</option>
              <option value="Laboratory">Laboratory</option>
              <option value="Facilities">Facilities</option>
              <option value="Admin">Admin</option>
              <option value="Logistics">Logistics</option>
          </select>
      </div>

          <div class="form-group">
            <label for="vehicleCapacity">Capacity</label>
            <input
                type="number"
                id="vehicleCapacity"
                name="capacity"
                placeholder="4"
            />
          </div>

          <div class="form-group">
            <label for="vehicleDriver">Assigned Driver</label>
            <select id="vehicleDriver"></select>
          </div>

          <div class="form-group">
            <label for="vehicleFuel">Fuel Type</label>
            <select
                id="vehicleFuel"
                name="fuel_type"
            >
                <option value="">Select Fuel Type</option>
                <option value="Diesel">Diesel</option>
                <option value="Gasoline">Gasoline</option>
                <option value="Premium Gasoline">Premium Gasoline</option>
                <option value="Electric">Electric</option>
                <option value="Hybrid">Hybrid</option>
            </select>
          </div>

          <div class="form-group">
            <label for="vehicleMileage">Current Mileage</label>
            <input
              type="number"
              id="vehicleMileage"
              name="current_odometer"
              min="0"
              step="0.01"
              placeholder="58240"
            />
          </div>

          <div class="form-group">
            <label for="vehicleTankCapacity">Tank Capacity (Liters)</label>
            <input
              type="number"
              id="vehicleTankCapacity"
              name="tank_capacity"
              min="0.01"
              step="0.01"
              placeholder="80"
            />
          </div>

          <div class="form-group">
            <label for="vehicleCurrentFuel">Current Fuel (Liters)</label>
            <input
              type="number"
              id="vehicleCurrentFuel"
              name="current_fuel"
              min="0"
              step="0.01"
              placeholder="40"
            />
          </div>

          <div class="form-group">
            <label for="vehicleStatus">Status *</label>
            <select
                id="vehicleStatus"
                name="status"
                required
            >   
                <option value="">Select Status Type</option>
                <option value="Available">Available</option>
                <option value="On Trip">On Trip</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Out of Service">Out of Service</option>
            </select>
          </div>

          <div class="form-group">
            <label for="vehiclePurchaseDate">Purchase Date</label>
            <input type="date" id="vehiclePurchaseDate" />
          </div>

          <div class="form-group">
            <label for="vehicleInsuranceExpiry">Insurance Expiry</label>
            <input type="date" id="vehicleInsuranceExpiry" />
          </div>
        </div>

        <div class="form-group">
          <label for="vehicleNotes">Notes</label>

          <textarea
            id="vehicleNotes"
            rows="4"
            placeholder="Additional vehicle information..."
          ></textarea>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn-outline" id="cancelVehicleModal">
            Cancel
          </button>

          <button type="submit" class="btn-primary" id="saveVehicleBtn">
            <i class="ph ph-floppy-disk"></i>
            Save Vehicle
          </button>
        </div>
      </form>
    </div>
  </div>
</div>
