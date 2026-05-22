<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Modules\HR\Enums\MilitaryStatusEnum;

return new class extends Migration {

    public function up(): void
    {
        Schema::create('worker_military_services', static function (Blueprint $table) {
            $table->id();
            $table->foreignId('worker_id')->constrained('workers');
            $table->string('name')->nullable();
            $table->string('number')->nullable();
            $table->string('speciality')->nullable();
            $table->tinyInteger('status')->default(MilitaryStatusEnum::ONE->value);
            $table->string('commissariat')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('worker_military_services');
    }
};
