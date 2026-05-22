<?php

namespace Modules\Structure\Http\Controllers;

use App\Helpers\Helper;
use App\Http\Controllers\Controller;
use App\Traits\Base64FileUploadTrait;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Modules\Structure\Models\UploadFile;

class UploadFileController extends Controller
{
    use Base64FileUploadTrait;

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'file'
        ]);

        $data = DB::transaction(function () use ($request) {
            $file = $request->file('file');
            $data['file_name'] = $file->getClientOriginalName();
            $data['file_extension'] = $file->getClientOriginalExtension();
            $data['file_path'] = $this->uploadFormFile($file, 'uploads', ['pdf', 'docx', 'jpg', 'png']);

            UploadFile::create($data);
            return $data;
        });

        return Helper::response(true, Helper::fileUrl($data['file_path']));
    }

}
