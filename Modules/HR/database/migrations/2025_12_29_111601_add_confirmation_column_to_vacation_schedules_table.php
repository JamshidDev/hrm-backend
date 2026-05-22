<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;
use Modules\Confirmation\Enums\ConfirmationTypeEnum;

return new class extends Migration
{

    public function up(): void
    {
        Schema::table('vacation_schedules', function (Blueprint $table) {
            $table->foreignId('vacation_schedule_year_id')->nullable()
                ->constrained('vacation_schedule_years')->cascadeOnDelete();
            $table->smallInteger('year')->nullable();
            $table->date('period_from')->nullable();
            $table->date('period_to')->nullable();
            $table->date('plan_date')->nullable();
            $table->date('real_date')->nullable();
            $table->integer('table_number')->nullable();
            $table->integer('all_days')->default(0);
            $table->integer('real_days')->default(0);

            $table->text('signature')->nullable();
            $table->tinyInteger('confirmation_type')->default(ConfirmationTypeEnum::DIGITAL->value);
            $table->tinyInteger('status')->index()->default(ConfirmationStatusEnum::PROCESS->value);

            $table->dropConstrainedForeignId('contract_id');
            $table->unique(['vacation_schedule_year_id','worker_id'],'unique_vacation_schedule_worker');
        });
    }


    public function down(): void
    {
        Schema::table('vacation_schedules', function (Blueprint $table) {
           $table->dropConstrainedForeignId('vacation_schedule_year_id');
           $table->dropColumn('year');
           $table->dropColumn('period_from');
           $table->dropColumn('period_to');
           $table->dropColumn('plan_date');
           $table->dropColumn('real_date');
           $table->dropColumn('table_number');
           $table->dropColumn('all_days');
           $table->dropColumn('real_days');
           $table->dropColumn('signature');
           $table->dropColumn('confirmation_type');
           $table->dropColumn('status');
        });
    }
};
