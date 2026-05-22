<?php

use App\Helpers\EconomistHelper;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {

    public function up(): void
    {
        Schema::create('statements', static function (Blueprint $table) {
            $table->id();
            $table->foreignId('economist_upload_id')->constrained('economist_uploads');
            $table->foreignId('organization_id')->constrained('organizations');
            $table->foreignId('worker_id')->nullable()->constrained('workers');
            $table->bigInteger('pin')->nullable()->index();
            $table->integer('year')->index();
            $table->tinyInteger('month')->index();
            $table->string('full_name', 150)->nullable();
            $table->string('position')->nullable();
            $table->double('main_salary')->default(0);
            $table->double('work_time')->default(0);
            $table->double('total_one')->default(0);
            $table->double('total_two')->default(0);
            $table->double('total_three')->default(0);
            $table->double('total_four')->default(0);
            $table->double('total_five')->default(0);

            foreach (array_merge(EconomistHelper::totalOneColumns(), EconomistHelper::totalThreeColumns(), EconomistHelper::totalFiveColumns()) as $column) {
                $table->double('s_' . $column)->default(0);
            }

            $table->timestamps();
            $table->softDeletes();

            $table->index(['year', 'month']);
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('statements');
    }
};
