<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::create('export_worker_errors', static function (Blueprint $table) {
            $table->id();
            $table->foreignId('export_worker_to_hik_central_job_id')->constrained('export_worker_to_hik_central_jobs');
            $table->foreignId('worker_id')->constrained('workers');
            $table->text('comment')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('export_worker_errors');
    }
};
