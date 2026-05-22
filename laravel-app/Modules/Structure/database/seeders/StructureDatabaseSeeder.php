<?php

namespace Modules\Structure\Database\Seeders;

use Illuminate\Database\Seeder;
use Modules\HR\Models\Nationality;
use Modules\Structure\Models\City;
use Modules\Structure\Models\Country;
use Modules\Structure\Models\Language;
use Modules\Structure\Models\Organization;
use Modules\Structure\Models\OrganizationService;
use Modules\Structure\Models\Position;
use Modules\Structure\Models\Region;
use Modules\Structure\Models\Speciality;
use Modules\Structure\Models\University;

class StructureDatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $json = file_get_contents(base_path('database/seeders/json/countries.json'));
        $countries = collect(json_decode($json, true, 512, JSON_THROW_ON_ERROR));
        $json = file_get_contents(base_path('database/seeders/json/regions.json'));
        $regions = collect(json_decode($json, true, 512, JSON_THROW_ON_ERROR));
        $json = file_get_contents(base_path('database/seeders/json/cities.json'));
        $cities = collect(json_decode($json, true, 512, JSON_THROW_ON_ERROR));

        $json = file_get_contents(base_path('database/seeders/json/nationalities.json'));
        $nationalities = collect(json_decode($json, true, 512, JSON_THROW_ON_ERROR));

        $json = file_get_contents(base_path('database/seeders/json/languages.json'));
        $languages = collect(json_decode($json, true, 512, JSON_THROW_ON_ERROR));

        $json = file_get_contents(base_path('database/seeders/json/new_positions.json'));
        $positions = collect(json_decode($json, true, 512, JSON_THROW_ON_ERROR));

        $json = file_get_contents(base_path('database/seeders/json/universities.json'));
        $universities = collect(json_decode($json, true, 512, JSON_THROW_ON_ERROR));

        $json = file_get_contents(base_path('database/seeders/json/speciality.json'));
        $specialities = collect(json_decode($json, true, 512, JSON_THROW_ON_ERROR));


        foreach ($positions as $position) {
            Position::updateOrCreate(
                ['id' => $position['id']], ['name' => $position['name'], 'category' => $position['category']]
            );
        }

        foreach ($countries as $county) {
            Country::updateOrCreate(
                ['id' => $county['id']],
                ['name' => $county['name'], 'name_ru' => $county['name_ru'], 'name_en' => $county['name_en']]
            );
        }

        foreach ($regions as $region) {
            Region::updateOrCreate(
                ['id' => $region['id']], [
                    'name'       => $region['name'],
                    'name_ru'    => $region['name_ru'],
                    'name_en'    => $region['name_en'],
                    'country_id' => $region['country_id'],
                ]
            );
        }

        foreach ($cities as $city) {
            City::updateOrCreate(
                ['id' => $city['id']], [
                    'name'      => $city['name'],
                    'region_id' => $city['region_id'],
                ]
            );
        }

        foreach ($nationalities as $nationality) {
            Nationality::updateOrCreate(
                ['id' => $nationality['id']], [
                    'name'    => $nationality['name'],
                    'name_ru' => $nationality['name_ru'],
                    'name_en' => $nationality['name_en'],
                ]
            );
        }

        foreach ($languages as $language) {
            Language::updateOrCreate(
                ['id' => $language['id']], [
                    'name'    => $language['name'],
                    'name_ru' => $language['name_ru'],
                    'name_en' => $language['name_en'],
                ]
            );
        }

        $json = file_get_contents(base_path('database/seeders/json/organizations.json'));
        $organizations = collect(json_decode($json, true, 512, JSON_THROW_ON_ERROR));

        foreach ($organizations as $organization) {
            Organization::updateOrCreate(
                ['id' => $organization['id']], [
                    'city_id'   => $organization['city_id'],
                    'code'      => $organization['code'],
                    'name'      => $organization['name'],
                    'name_ru'   => $organization['name_ru'],
                    'name_en'   => $organization['name_en'],
                    'full_name' => $organization['full_name'],
                    'level'     => $organization['level'],
                    '_lft'      => $organization['_lft'],
                    '_rgt'      => $organization['_rgt'],
                    'parent_id' => $organization['parent_id'],
                    'inn'       => $organization['inn'],
                    'lat'       => $organization['lat'],
                    'long'      => $organization['long'],
                    'address'   => $organization['address'],
                    'group'     => $organization['group'],
                    'external'  => $organization['external'],
                ]
            );
        }

        foreach ($universities as $univer) {
            University::updateOrCreate(
                ['id' => $univer['id']], [
                    'name'      => $univer['name'],
                    'education' => $univer['education'],
                    'type'      => 1,
                    'city_id'   => $univer['city_id']
                ]
            );
        }

        foreach ($specialities as $spec) {
            Speciality::updateOrCreate(
                ['id' => $spec['id']], ['name' => $spec['name'], 'code' => $spec['code']]
            );
        }

        OrganizationService::create([
            'organization_id' => 1,
            'key'             => 'e-signature',
            'active'          => true
        ]);
    }
}
