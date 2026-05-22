<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::create('worker_photos', static function (Blueprint $table) {
            $table->id();
            $table->foreignId('worker_id')->nullable()->constrained('workers')->cascadeOnDelete();
            $table->string('photo')->nullable();
            $table->boolean('current')->default(true)->index();
            $table->timestamps();
            $table->softDeletes();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('worker_photos');
    }
};
