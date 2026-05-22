<?php

use App\Enums\ExportJobStatusEnum;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {

    public function up(): void
    {
        Schema::create('user_export_tasks', static function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->tinyInteger('type')->index();
            $table->string('file')->nullable();
            $table->tinyInteger('status')->default(ExportJobStatusEnum::PROCESS->value)->index();
            $table->text('message')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('user_export_tasks');
    }
};
