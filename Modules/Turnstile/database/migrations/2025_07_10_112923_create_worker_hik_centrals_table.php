<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {

    public function up(): void
    {
        Schema::create('worker_hik_centrals', static function (Blueprint $table) {
            $table->id();
            $table->foreignId('worker_id')->constrained('workers');
            $table->tinyInteger('hik_central_key')->index();
            $table->bigInteger('hik_central_person_id')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['worker_id', 'hik_central_key', 'hik_central_person_id'], 'unique_worker_persons');
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('worker_hik_centrals');
    }
};
