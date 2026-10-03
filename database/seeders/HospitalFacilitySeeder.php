<?php

namespace Database\Seeders;

use App\Models\HospitalFacility;
use Illuminate\Database\Seeder;

class HospitalFacilitySeeder extends Seeder
{
    public function run(): void
    {
        $hospitals = [

            /*
            |--------------------------------------------------------------------------
            | TALA / NORTH CALOOCAN
            |--------------------------------------------------------------------------
            */

            [
                'name' => 'Dr. Jose N. Rodriguez Memorial Hospital and Sanitarium',
                'address' => 'Saint Joseph Avenue, Tala',
                'city' => 'Caloocan City',
                'province' => 'Metro Manila',
                'latitude' => 14.7546,
                'longitude' => 121.0837,
                'type' => 'Hospital',
                'status' => true,
            ],

            [
                'name' => 'North Caloocan Doctors Hospital',
                'address' => 'Bankers Village, Block 10, Lot 31 Quirino Highway, Tala',
                'city' => 'Caloocan City',
                'province' => 'Metro Manila',
                'latitude' => 14.7464,
                'longitude' => 121.0777,
                'type' => 'Hospital',
                'status' => true,
            ],

            [
                'name' => 'Caloocan City North Medical Center',
                'address' => 'Susano Road, Barangay 177, Camarin',
                'city' => 'Caloocan City',
                'province' => 'Metro Manila',
                'latitude' => 14.7367,
                'longitude' => 121.0634,
                'type' => 'Hospital',
                'status' => true,
            ],

            [
                'name' => 'Camarin Doctors Hospital',
                'address' => 'No. 1 Camarin Road, Barangay 172, Camarin',
                'city' => 'Caloocan City',
                'province' => 'Metro Manila',
                'latitude' => 14.7350,
                'longitude' => 121.0549,
                'type' => 'Hospital',
                'status' => true,
            ],

            [
                'name' => 'Nodado General Hospital',
                'address' => 'Camarin Road',
                'city' => 'Caloocan City',
                'province' => 'Metro Manila',
                'latitude' => 14.7338,
                'longitude' => 121.0567,
                'type' => 'Hospital',
                'status' => true,
            ],

            [
                'name' => 'San Lorenzo Hospital Health Management Co., Inc.',
                'address' => '24 Susano Road, Barangay 170, Deparo',
                'city' => 'Caloocan City',
                'province' => 'Metro Manila',
                'latitude' => 14.7257,
                'longitude' => 121.0534,
                'type' => 'Hospital',
                'status' => true,
            ],

            [
                'name' => 'Caloocan City Medical Center',
                'address' => '450 A. Mabini Street',
                'city' => 'Caloocan City',
                'province' => 'Metro Manila',
                'latitude' => 14.6536,
                'longitude' => 120.9990,
                'type' => 'Hospital',
                'status' => true,
            ],

            [
                'name' => 'Gat Andres Bonifacio Memorial Medical Center',
                'address' => 'Gen. Luna Street',
                'city' => 'Caloocan City',
                'province' => 'Metro Manila',
                'latitude' => 14.6572,
                'longitude' => 120.9705,
                'type' => 'Hospital',
                'status' => true,
            ],

            /*
            |--------------------------------------------------------------------------
            | NOVALICHES / QUEZON CITY NORTH
            |--------------------------------------------------------------------------
            */

            [
                'name' => 'Novaliches General Hospital',
                'address' => 'Quirino Highway, Novaliches',
                'city' => 'Quezon City',
                'province' => 'Metro Manila',
                'latitude' => 14.7219,
                'longitude' => 121.0457,
                'type' => 'Hospital',
                'status' => true,
            ],

            [
                'name' => 'Novaliches District Hospital',
                'address' => 'Novaliches',
                'city' => 'Quezon City',
                'province' => 'Metro Manila',
                'latitude' => 14.7188,
                'longitude' => 121.0422,
                'type' => 'Hospital',
                'status' => true,
            ],

            [
                'name' => 'Commonwealth Hospital and Medical Center',
                'address' => 'Old Balara, Commonwealth Avenue',
                'city' => 'Quezon City',
                'province' => 'Metro Manila',
                'latitude' => 14.6866,
                'longitude' => 121.0788,
                'type' => 'Hospital',
                'status' => true,
            ],

            [
                'name' => 'Fairview General Hospital',
                'address' => 'Regalado Avenue, Fairview',
                'city' => 'Quezon City',
                'province' => 'Metro Manila',
                'latitude' => 14.7060,
                'longitude' => 121.0608,
                'type' => 'Hospital',
                'status' => true,
            ],

            [
                'name' => 'FEU-NRMF Medical Center',
                'address' => 'Regalado Avenue, Fairview',
                'city' => 'Quezon City',
                'province' => 'Metro Manila',
                'latitude' => 14.7038,
                'longitude' => 121.0596,
                'type' => 'Hospital',
                'status' => true,
            ],

            [
                'name' => 'Novaliches General Hospital and Medical Center',
                'address' => 'Quirino Highway, Novaliches',
                'city' => 'Quezon City',
                'province' => 'Metro Manila',
                'latitude' => 14.7185,
                'longitude' => 121.0470,
                'type' => 'Hospital',
                'status' => true,
            ],

            /*
            |--------------------------------------------------------------------------
            | QUEZON CITY
            |--------------------------------------------------------------------------
            */

            [
                'name' => 'Quezon City General Hospital',
                'address' => 'Seminary Road, Project 8',
                'city' => 'Quezon City',
                'province' => 'Metro Manila',
                'latitude' => 14.6599,
                'longitude' => 121.0117,
                'type' => 'Hospital',
                'status' => true,
            ],

            [
                'name' => 'East Avenue Medical Center',
                'address' => 'East Avenue, Diliman',
                'city' => 'Quezon City',
                'province' => 'Metro Manila',
                'latitude' => 14.6466,
                'longitude' => 121.0493,
                'type' => 'Hospital',
                'status' => true,
            ],

            [
                'name' => 'Philippine Heart Center',
                'address' => 'East Avenue, Diliman',
                'city' => 'Quezon City',
                'province' => 'Metro Manila',
                'latitude' => 14.6447,
                'longitude' => 121.0499,
                'type' => 'Hospital',
                'status' => true,
            ],

            [
                'name' => 'National Kidney and Transplant Institute',
                'address' => 'East Avenue, Diliman',
                'city' => 'Quezon City',
                'province' => 'Metro Manila',
                'latitude' => 14.6446,
                'longitude' => 121.0517,
                'type' => 'Hospital',
                'status' => true,
            ],

            [
                'name' => 'Lung Center of the Philippines',
                'address' => 'Quezon Avenue, Diliman',
                'city' => 'Quezon City',
                'province' => 'Metro Manila',
                'latitude' => 14.6460,
                'longitude' => 121.0392,
                'type' => 'Hospital',
                'status' => true,
            ],

            [
                'name' => 'Philippine Children’s Medical Center',
                'address' => 'Quezon Avenue, Diliman',
                'city' => 'Quezon City',
                'province' => 'Metro Manila',
                'latitude' => 14.6508,
                'longitude' => 121.0431,
                'type' => 'Hospital',
                'status' => true,
            ],

            [
                'name' => 'Quirino Memorial Medical Center',
                'address' => 'JP Rizal corner P. Tuazon Streets, Project 4',
                'city' => 'Quezon City',
                'province' => 'Metro Manila',
                'latitude' => 14.6254,
                'longitude' => 121.0640,
                'type' => 'Hospital',
                'status' => true,
            ],

            [
                'name' => 'National Children’s Hospital',
                'address' => 'E. Rodriguez Avenue',
                'city' => 'Quezon City',
                'province' => 'Metro Manila',
                'latitude' => 14.6257,
                'longitude' => 121.0332,
                'type' => 'Hospital',
                'status' => true,
            ],

            [
                'name' => 'De Los Santos Medical Center',
                'address' => 'Ortigas Avenue, Diliman',
                'city' => 'Quezon City',
                'province' => 'Metro Manila',
                'latitude' => 14.6318,
                'longitude' => 121.0487,
                'type' => 'Hospital',
                'status' => true,
            ],

            [
                'name' => 'Diliman Doctors Hospital',
                'address' => 'Quezon Avenue, Diliman',
                'city' => 'Quezon City',
                'province' => 'Metro Manila',
                'latitude' => 14.6395,
                'longitude' => 121.0458,
                'type' => 'Hospital',
                'status' => true,
            ],

            /*
            |--------------------------------------------------------------------------
            | MANILA
            |--------------------------------------------------------------------------
            */

            [
                'name' => 'Philippine General Hospital',
                'address' => 'Taft Avenue, Ermita',
                'city' => 'Manila',
                'province' => 'Metro Manila',
                'latitude' => 14.5794,
                'longitude' => 120.9890,
                'type' => 'Hospital',
                'status' => true,
            ],

            [
                'name' => 'Jose R. Reyes Memorial Medical Center',
                'address' => 'Rizal Avenue, Santa Cruz',
                'city' => 'Manila',
                'province' => 'Metro Manila',
                'latitude' => 14.6130,
                'longitude' => 120.9820,
                'type' => 'Hospital',
                'status' => true,
            ],

            [
                'name' => 'Dr. Jose Fabella Memorial Hospital',
                'address' => 'Lope de Vega Street, Santa Cruz',
                'city' => 'Manila',
                'province' => 'Metro Manila',
                'latitude' => 14.6114,
                'longitude' => 120.9839,
                'type' => 'Hospital',
                'status' => true,
            ],

            [
                'name' => 'San Lazaro Hospital',
                'address' => 'Rizal Avenue, Santa Cruz',
                'city' => 'Manila',
                'province' => 'Metro Manila',
                'latitude' => 14.6170,
                'longitude' => 120.9825,
                'type' => 'Hospital',
                'status' => true,
            ],

            [
                'name' => 'Manila Doctors Hospital',
                'address' => '667 United Nations Avenue, Ermita',
                'city' => 'Manila',
                'province' => 'Metro Manila',
                'latitude' => 14.5818,
                'longitude' => 120.9816,
                'type' => 'Hospital',
                'status' => true,
            ],

            [
                'name' => 'Chinese General Hospital and Medical Center',
                'address' => '286 Blumentritt Street, Santa Cruz',
                'city' => 'Manila',
                'province' => 'Metro Manila',
                'latitude' => 14.6228,
                'longitude' => 120.9826,
                'type' => 'Hospital',
                'status' => true,
            ],

            /*
            |--------------------------------------------------------------------------
            | MARIKINA
            |--------------------------------------------------------------------------
            */

            [
                'name' => 'Amang Rodriguez Memorial Medical Center',
                'address' => 'Marikina-Infanta Highway, Sto. Niño',
                'city' => 'Marikina City',
                'province' => 'Metro Manila',
                'latitude' => 14.6380,
                'longitude' => 121.1000,
                'type' => 'Hospital',
                'status' => true,
            ],

            /*
            |--------------------------------------------------------------------------
            | PASIG
            |--------------------------------------------------------------------------
            */

            [
                'name' => 'Rizal Medical Center',
                'address' => 'Pasig Boulevard, Bagong Ilog',
                'city' => 'Pasig City',
                'province' => 'Metro Manila',
                'latitude' => 14.5667,
                'longitude' => 121.0817,
                'type' => 'Hospital',
                'status' => true,
            ],
        ];

        foreach ($hospitals as $hospital) {
            HospitalFacility::updateOrCreate(
                [
                    'name' => $hospital['name'],
                    'city' => $hospital['city'],
                ],
                $hospital
            );
        }
    }
}