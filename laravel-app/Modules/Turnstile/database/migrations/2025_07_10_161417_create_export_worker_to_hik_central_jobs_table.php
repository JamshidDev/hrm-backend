<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::create('export_worker_to_hik_central_jobs', static function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users');
            $table->string('name')->nullable();
            $table->integer('workers_count')->default(0);
            $table->integer('exported_count')->default(0);
            $table->tinyInteger('status')->default(1);
            $table->text('errors')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('export_worker_to_hik_central_jobs');
    }
};
