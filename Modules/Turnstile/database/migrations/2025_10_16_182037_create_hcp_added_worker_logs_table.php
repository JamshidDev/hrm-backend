<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::create('hcp_added_worker_logs', static function (Blueprint $table) {
            $table->id();
            $table->foreignId('worker_id')->unique()->constrained('workers');
            $table->foreignId('user_id')->constrained('users');
            $table->foreignId('worker_photo_id')->constrained('worker_photos');
            $table->foreignId('h_c_p_device_id')->nullable()->constrained('h_c_p_devices');
            $table->tinyInteger('code')->default(1);
            $table->string('status', 15);
            $table->tinyInteger('result')->default(1);
            $table->text('error')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('hcp_added_worker_logs');
    }
};
