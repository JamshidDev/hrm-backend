<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {

    public function up(): void
    {
        Schema::create('terminal_events', static function (Blueprint $table) {
            $table->id();
            $table->foreignId('worker_id')->nullable()->constrained('workers');
            $table->foreignId('hik_central_access_level_id')
                ->nullable()
                ->constrained('hik_central_access_levels');

            $table->date('event_date')->nullable()->index();
            $table->time('event_time')->nullable()->index();
            $table->string('auth_type', 150)->nullable();
            $table->string('device_name')->nullable();
            $table->string('device_serial', 50)->nullable()->index();
            $table->string('resource_name')->nullable();
            $table->string('last_name')->nullable();
            $table->string('first_name')->nullable();
            $table->string('middle_name')->nullable();
            $table->boolean('direction')->nullable()->index();
            $table->double('temperature')->nullable();
            $table->tinyInteger('mask_status')->nullable()->index();
            $table->timestamps();
            $table->softDeletes();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('terminal_events');
    }
};
