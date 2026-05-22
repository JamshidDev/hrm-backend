<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::create('statement_aggregates', static function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->nullable()->constrained('organizations');
            $table->integer('year')->index();
            $table->tinyInteger('month')->index();
            $table->integer('code')->index();
            $table->double('total_sum')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['year', 'month']);
            $table->unique(['organization_id', 'year', 'month', 'code'], 'agg_unique_idx');
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('statement_aggregates');
    }
};
