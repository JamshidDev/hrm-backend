<?php

namespace Modules\HR\Database\Seeders;

use App\Models\User;
use App\Traits\Base64FileUploadTrait;
use Illuminate\Database\Seeder;
use Modules\HR\Models\Worker;
use Modules\HR\Models\WorkerPhoto;
use Spatie\Permission\Models\Role;

class HRDatabaseSeeder extends Seeder
{
    use Base64FileUploadTrait;

    public function run(): void
    {
        $worker = Worker::create([
            'pin'               => 31604965320012,
            'last_name'         => 'Boboqulov',
            'first_name'        => 'Jobir',
            'middle_name'       => 'Xasanovich',
            'country_id'        => 1,
            'region_id'         => 2,
            'city_id'           => 1,
            'current_region_id' => 2,
            'current_city_id'   => 1,
            'nationality_id'    => 1,
            'birthday'          => '1996-04-16',
            'address'           => 'Yashnabod tumani, 25/6 62'
        ]);

        $fileName = md5(time()) . '.jpg';
        WorkerPhoto::create([
            'worker_id' => $worker->id,
            'photo'     => new self()->uploadFileFromPath(
                public_path('assets/img/users/2.jpg'),
                $fileName,
                'worker-photos'
            ),
        ]);

        $user = User::create([
            'organization_id' => 1,
            'phone'           => 977226656,
            'password'        => bcrypt('12345678'),
            'worker_id'       => $worker->id
        ]);

        $role = Role::findByName('Admin');

        $user->roles()->attach($role->id, [
            'organization_id' => 1,
            'model_type'      => User::class,
        ]);
    }
}
