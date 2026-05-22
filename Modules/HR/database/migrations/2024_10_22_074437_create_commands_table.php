<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;
use Modules\HR\Enums\CommandTypeEnum;

return new class extends Migration {

    public function up(): void
    {
        Schema::create('commands', static function (Blueprint $table) {
            $table->uuid();
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->tinyInteger('type')->index()->default(CommandTypeEnum::ONE->value);
            $table->foreignId('user_id')->nullable()->constrained('users');
            $table->foreignId('director_id')->nullable()->constrained('confirmation_workers');
            $table->date('command_date')->index()->nullable();
            $table->string('command_number', 15)->nullable();
            $table->string('file')->nullable();
            $table->string('confirmation_file')->nullable();
            $table->tinyInteger('confirmation')->index()->default(ConfirmationStatusEnum::PROCESS->value);
            $table->string('contract_model_type')->nullable();
            $table->bigInteger('contract_model_id')->nullable();
            $table->tinyInteger('generate')->default(2);
            $table->timestamps();
            $table->softDeletes();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('commands');
    }
};
