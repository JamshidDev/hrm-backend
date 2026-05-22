<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Modules\Turnstile\Models\WorkerHikCentral;

return new class extends Migration {

    public function up(): void
    {
        Schema::table('worker_hik_centrals', static function (Blueprint $table) {
            $table->dateTime('to')->after('hik_central_person_id')->nullable();
        });
        WorkerHikCentral::query()->update(['to' => '2027-08-01 00:00:00']);
    }


    public function down(): void
    {
        Schema::table('worker_hik_centrals', static function (Blueprint $table) {
            $table->dropColumn('to');
        });
    }
};
