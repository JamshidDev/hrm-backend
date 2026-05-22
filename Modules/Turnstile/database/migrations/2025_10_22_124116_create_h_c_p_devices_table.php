<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::create('h_c_p_devices', static function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->nullable()->constrained('organizations');
            $table->bigInteger('device_id')->nullable()->unique()->index();
            $table->string('name');
            $table->string('device_code')->nullable();
            $table->string('serial_number')->nullable();
            $table->macAddress()->nullable();
            $table->ipAddress()->nullable();
            $table->boolean('status')->default(true);
            $table->boolean('config')->default(false);
            $table->boolean('log')->default(false);
            $table->boolean('upload_workers')->default(false);
            $table->string('contract_number')->nullable();
            $table->date('contract_date')->nullable();
            $table->double('price')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('h_c_p_devices');
    }
};
