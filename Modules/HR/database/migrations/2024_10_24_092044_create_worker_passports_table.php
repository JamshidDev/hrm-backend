<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {

    public function up(): void
    {
        Schema::create('worker_passports', static function (Blueprint $table) {
            $table->id();
            $table->foreignId('worker_id')->nullable()->constrained('workers')->cascadeOnDelete();
            $table->string('serial_number', 15)->nullable();
            $table->date('from_date')->nullable();
            $table->date('to_date')->nullable()->index();
            $table->string('file')->nullable();
            $table->string('address')->nullable();
            $table->string('code', 3)->default('uzb');
            $table->boolean('current')->default(true)->index();
            $table->timestamps();
            $table->softDeletes();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('worker_passports');
    }
};
