<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;

return new class extends Migration {

    public function up(): void
    {
        Schema::create('position_instructions', static function (Blueprint $table) {
            $table->uuid();
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users');
            $table->foreignId('director_id')->nullable()->constrained('confirmation_workers');
            $table->foreignId('position_id')->nullable()->constrained('positions');
            $table->date('created')->nullable();
            $table->string('number', 30)->unique();
            $table->string('file')->nullable();
            $table->string('confirmation_file')->nullable();
            $table->tinyInteger('confirmation')->index()->default(ConfirmationStatusEnum::PROCESS->value);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('position_instructions');
    }
};
