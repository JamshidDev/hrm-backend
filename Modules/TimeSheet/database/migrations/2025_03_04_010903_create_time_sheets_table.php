<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;

return new class extends Migration {

    public function up(): void
    {
        Schema::create('time_sheets', static function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users');
            $table->foreignId('department_id')->nullable()->constrained('departments');
            $table->foreignId('work_place_id')->nullable()->constrained('organizations');
            $table->integer('year')->index();
            $table->integer('month')->index();
            $table->string('file')->nullable();
            $table->string('confirmation_file')->nullable();
            $table->boolean('status')->default(false);
            $table->tinyInteger('generate')->default(2);
            $table->tinyInteger('confirmation')->default(ConfirmationStatusEnum::PROCESS->value);
            $table->timestamps();
            $table->softDeletes();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('time_sheets');
    }
};
